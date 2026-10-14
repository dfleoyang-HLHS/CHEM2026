// 題庫互動邏輯：作答、詳解顯示、統計、智慧錯題本（以 localStorage 儲存於本機瀏覽器）
(function () {
  const STORAGE_KEY = "chem_quiz_progress_v1";

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }
  function saveProgress(progress) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  let progress = loadProgress();
  const params = new URLSearchParams(window.location.search);
  const topicFilter = params.get("topic");

  const state = {
    subject: "all",
    difficulty: "all",
    type: "all",
    search: "",
    mode: "practice",
  };

  const subjectSelect = document.getElementById("filter-subject");
  const difficultySelect = document.getElementById("filter-difficulty");
  const typeSelect = document.getElementById("filter-type");
  const searchInput = document.getElementById("filter-search");

  function nl2br(str) {
    return str.replace(/\n/g, "<br/>");
  }
  function isMulti(q) {
    return Array.isArray(q.multiAnswer);
  }
  function sameSet(a, b) {
    if (a.length !== b.length) return false;
    const sa = [...a].sort().join(",");
    const sb = [...b].sort().join(",");
    return sa === sb;
  }

  function populateSubjectFilter() {
    const opts = ['<option value="all">全部單元</option>'];
    Object.values(CURRICULUM).forEach((s) => {
      opts.push(`<option value="${s.key}">${s.title}</option>`);
    });
    subjectSelect.innerHTML = opts.join("");
  }

  function findTopicTitle(topicId) {
    for (const s of Object.values(CURRICULUM)) {
      for (const u of s.units) {
        const t = u.topics.find((x) => x.id === topicId);
        if (t) return t.title;
      }
    }
    return null;
  }

  function filteredQuestions() {
    return QUESTIONS.filter((q) => {
      if (topicFilter && q.topicId !== topicFilter) return false;
      if (state.subject !== "all" && q.subjectKey !== state.subject) return false;
      if (state.difficulty !== "all" && q.difficulty !== state.difficulty) return false;
      if (state.type === "simulated" && !q.simulated) return false;
      if (state.type === "real" && !q.examSource) return false;
      if (state.type === "regular" && (q.simulated || q.examSource)) return false;
      if (state.search) {
        const hay = (q.question + " " + q.options.join(" ")).toLowerCase();
        if (!hay.includes(state.search.toLowerCase())) return false;
      }
      return true;
    });
  }

  function renderStats() {
    const total = QUESTIONS.length;
    const simulatedCount = QUESTIONS.filter((q) => q.simulated).length;
    const realCount = QUESTIONS.filter((q) => q.examSource).length;
    const answeredIds = Object.keys(progress).filter((id) => progress[id].answered);
    const correctIds = answeredIds.filter((id) => progress[id].correct);
    const wrongIds = answeredIds.filter((id) => !progress[id].correct);
    const accuracy = answeredIds.length ? Math.round((correctIds.length / answeredIds.length) * 100) : 0;

    document.getElementById("stat-bar").innerHTML = `
      <div class="stat-box"><strong>${total}</strong><span>題庫總題數</span></div>
      <div class="stat-box"><strong>${realCount}</strong><span>📜 歷屆考古題</span></div>
      <div class="stat-box"><strong>${simulatedCount}</strong><span>🧭 仿真模擬題</span></div>
      <div class="stat-box"><strong>${answeredIds.length}</strong><span>已作答題數</span></div>
      <div class="stat-box"><strong>${accuracy}%</strong><span>目前正確率</span></div>
      <div class="stat-box"><strong>${wrongIds.length}</strong><span>錯題本題數</span></div>
    `;
  }

  function renderQuizList() {
    const list = document.getElementById("quiz-list");
    const qs = filteredQuestions();
    if (qs.length === 0) {
      list.innerHTML = `<div class="empty-state">找不到符合篩選條件的題目。</div>`;
      return;
    }
    list.innerHTML = qs.map((q) => quizCardHTML(q)).join("");
    qs.forEach((q) => attachQuizHandlers(q));
  }

  function metaChips(q) {
    let chips = `<span class="chip diff-${q.difficulty}">${q.difficulty}</span><span class="chip">${q.unitTitle}</span>`;
    if (q.examSource) chips += `<span class="chip chip-real">📜 ${q.examSource}</span>`;
    if (q.simulated) chips += `<span class="chip chip-sim">🧭 仿真模擬題</span>`;
    if (isMulti(q)) chips += `<span class="chip">多選題</span>`;
    return chips;
  }

  function optionsHTML(q, qid, saved) {
    return q.options
      .map((opt, idx) => {
        let cls = "";
        if (isMulti(q)) {
          if (saved && saved.answered) {
            const picked = (saved.selected || []).includes(idx);
            const shouldPick = q.multiAnswer.includes(idx);
            if (shouldPick) cls = "correct";
            else if (picked) cls = "incorrect";
          }
        } else if (saved && saved.answered) {
          cls = idx === q.answerIndex ? "correct" : saved.selected === idx ? "selected incorrect" : "";
        }
        return `<div class="quiz-option ${cls}" data-idx="${idx}">${String.fromCharCode(65 + idx)}. ${opt}</div>`;
      })
      .join("");
  }

  function quizCardHTML(q) {
    const saved = progress[q.id];
    const topicTitle = findTopicTitle(q.topicId);
    return `
      <div class="quiz-card" id="card-${q.id}">
        <div class="quiz-meta">
          ${metaChips(q)}
          ${topicTitle ? `<a href="roadmap.html#${q.topicId}" class="chip" style="text-decoration:none;">🔗 ${topicTitle}</a>` : ""}
        </div>
        ${q.simulated ? `<div class="sim-note">依近年學測／分科測驗命題趨勢原創設計之模擬題，並非正式歷屆試題逐字內容。</div>` : ""}
        ${q.examSource ? `<div class="sim-note">依官方試題 PDF 逐字轉錄；答案已對照大考中心公告之「115學年度學科能力測驗自然考科選擇題參考答案」確認無誤。</div>` : ""}
        <div class="quiz-question">${nl2br(q.question)}</div>
        <div class="quiz-options" data-qid="${q.id}">
          ${optionsHTML(q, q.id, saved)}
        </div>
        ${isMulti(q) && !(saved && saved.answered) ? `<div class="quiz-actions"><button class="btn btn-primary btn-sm" data-submit="${q.id}">送出答案（多選題，可複選）</button></div>` : ""}
        <div class="quiz-explain ${saved && saved.answered ? "show" : ""}" id="explain-${q.id}">
          <strong>詳解：</strong>${q.explanation}
        </div>
      </div>
    `;
  }

  function gradeSingle(q, idx) {
    const correct = idx === q.answerIndex;
    progress[q.id] = { answered: true, correct, selected: idx };
    saveProgress(progress);
  }
  function gradeMulti(q, selectedArr) {
    const correct = sameSet(selectedArr, q.multiAnswer);
    progress[q.id] = { answered: true, correct, selected: selectedArr };
    saveProgress(progress);
  }

  function paintSingleResult(container, q, idx) {
    container.querySelectorAll(".quiz-option").forEach((el) => {
      const elIdx = parseInt(el.dataset.idx, 10);
      if (elIdx === q.answerIndex) el.classList.add("correct");
      else if (elIdx === idx) el.classList.add("incorrect");
    });
  }
  function paintMultiResult(container, q, selectedArr) {
    container.querySelectorAll(".quiz-option").forEach((el) => {
      const elIdx = parseInt(el.dataset.idx, 10);
      const shouldPick = q.multiAnswer.includes(elIdx);
      const picked = selectedArr.includes(elIdx);
      el.classList.remove("selected");
      if (shouldPick) el.classList.add("correct");
      else if (picked) el.classList.add("incorrect");
    });
  }

  function attachQuizHandlers(q) {
    const container = document.querySelector(`.quiz-options[data-qid="${q.id}"]`);
    if (!container) return;
    const saved = progress[q.id];
    if (saved && saved.answered) return; // already answered, locked

    if (isMulti(q)) {
      const selected = new Set();
      container.querySelectorAll(".quiz-option").forEach((optEl) => {
        optEl.addEventListener("click", () => {
          const idx = parseInt(optEl.dataset.idx, 10);
          if (selected.has(idx)) {
            selected.delete(idx);
            optEl.classList.remove("selected");
          } else {
            selected.add(idx);
            optEl.classList.add("selected");
          }
        });
      });
      const submitBtn = document.querySelector(`[data-submit="${q.id}"]`);
      if (submitBtn) {
        submitBtn.addEventListener("click", () => {
          const arr = [...selected];
          if (arr.length === 0) {
            alert("請至少選擇一個選項再送出。");
            return;
          }
          gradeMulti(q, arr);
          paintMultiResult(container, q, arr);
          document.getElementById(`explain-${q.id}`).classList.add("show");
          submitBtn.closest(".quiz-actions").remove();
          renderStats();
        });
      }
    } else {
      container.querySelectorAll(".quiz-option").forEach((optEl) => {
        optEl.addEventListener("click", () => {
          const idx = parseInt(optEl.dataset.idx, 10);
          gradeSingle(q, idx);
          paintSingleResult(container, q, idx);
          document.getElementById(`explain-${q.id}`).classList.add("show");
          renderStats();
        });
      });
    }
  }

  function renderWrongbook() {
    const list = document.getElementById("wrongbook-list");
    const wrongQs = QUESTIONS.filter((q) => progress[q.id] && progress[q.id].answered && !progress[q.id].correct);
    if (wrongQs.length === 0) {
      list.innerHTML = `<div class="empty-state">目前沒有錯題，繼續保持！或前往「分級練習」開始作答。</div>`;
      return;
    }
    // 依觀念分組，提供觀念盲點分析
    const byTopic = {};
    wrongQs.forEach((q) => {
      byTopic[q.topicId] = byTopic[q.topicId] || [];
      byTopic[q.topicId].push(q);
    });

    let html = `<p style="color:var(--color-text-muted);margin-bottom:16px;">系統依錯題自動歸納出你的觀念盲點，建議優先複習以下主題：</p>`;
    html += `<div class="card-grid" style="margin-bottom:28px;">`;
    Object.entries(byTopic).forEach(([topicId, qs]) => {
      const title = findTopicTitle(topicId) || topicId;
      html += `
        <div class="card">
          <div class="card-icon" style="background:#fee2e2;color:#b91c1c;">⚠️</div>
          <h3>${title}</h3>
          <p>錯題數：${qs.length} 題</p>
          <a class="card-link" href="roadmap.html#${topicId}">回到觀念小卡複習 →</a>
        </div>
      `;
    });
    html += `</div>`;
    html += `<h3 style="margin-bottom:14px;">錯題重新演練</h3>`;
    html += wrongQs.map((q) => wrongCardHTML(q)).join("");
    list.innerHTML = html;

    wrongQs.forEach((q) => attachRetryHandlers(q));
  }

  function wrongCardHTML(q) {
    return `
      <div class="quiz-card" id="wrong-${q.id}">
        <div class="quiz-meta">${metaChips(q)}</div>
        <div class="quiz-question">${nl2br(q.question)}</div>
        <div class="quiz-options" data-qid="retry-${q.id}">
          ${q.options
            .map((opt, idx) => `<div class="quiz-option" data-idx="${idx}">${String.fromCharCode(65 + idx)}. ${opt}</div>`)
            .join("")}
        </div>
        ${isMulti(q) ? `<div class="quiz-actions"><button class="btn btn-primary btn-sm" data-submit="retry-${q.id}">送出答案（多選題，可複選）</button></div>` : ""}
        <div class="quiz-explain" id="retry-explain-${q.id}"><strong>詳解：</strong>${q.explanation}</div>
      </div>
    `;
  }

  function attachRetryHandlers(q) {
    const container = document.querySelector(`.quiz-options[data-qid="retry-${q.id}"]`);
    if (!container) return;

    if (isMulti(q)) {
      const selected = new Set();
      container.querySelectorAll(".quiz-option").forEach((optEl) => {
        optEl.addEventListener("click", () => {
          const idx = parseInt(optEl.dataset.idx, 10);
          if (selected.has(idx)) {
            selected.delete(idx);
            optEl.classList.remove("selected");
          } else {
            selected.add(idx);
            optEl.classList.add("selected");
          }
        });
      });
      const submitBtn = document.querySelector(`[data-submit="retry-${q.id}"]`);
      if (submitBtn) {
        submitBtn.addEventListener("click", () => {
          const arr = [...selected];
          if (arr.length === 0) {
            alert("請至少選擇一個選項再送出。");
            return;
          }
          const correct = sameSet(arr, q.multiAnswer);
          paintMultiResult(container, q, arr);
          document.getElementById(`retry-explain-${q.id}`).classList.add("show");
          submitBtn.closest(".quiz-actions").remove();
          if (correct) {
            progress[q.id] = { answered: true, correct: true, selected: arr };
            saveProgress(progress);
            renderStats();
          }
        });
      }
    } else {
      container.querySelectorAll(".quiz-option").forEach((optEl) => {
        optEl.addEventListener("click", () => {
          const idx = parseInt(optEl.dataset.idx, 10);
          const correct = idx === q.answerIndex;
          paintSingleResult(container, q, idx);
          document.getElementById(`retry-explain-${q.id}`).classList.add("show");
          if (correct) {
            progress[q.id] = { answered: true, correct: true, selected: idx };
            saveProgress(progress);
            renderStats();
          }
        });
      });
    }
  }

  function switchMode(mode) {
    state.mode = mode;
    document.querySelectorAll("#mode-tabs .tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
    document.getElementById("practice-panel").style.display = mode === "practice" ? "block" : "none";
    document.getElementById("wrongbook-panel").style.display = mode === "wrongbook" ? "block" : "none";
    if (mode === "wrongbook") renderWrongbook();
  }

  document.addEventListener("DOMContentLoaded", () => {
    populateSubjectFilter();
    renderStats();
    renderQuizList();

    document.querySelectorAll("#mode-tabs .tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchMode(btn.dataset.mode));
    });

    subjectSelect.addEventListener("change", () => {
      state.subject = subjectSelect.value;
      renderQuizList();
    });
    difficultySelect.addEventListener("change", () => {
      state.difficulty = difficultySelect.value;
      renderQuizList();
    });
    typeSelect.addEventListener("change", () => {
      state.type = typeSelect.value;
      renderQuizList();
    });
    searchInput.addEventListener("input", () => {
      state.search = searchInput.value.trim();
      renderQuizList();
    });
    document.getElementById("reset-quiz").addEventListener("click", () => {
      if (confirm("確定要清除所有作答紀錄與錯題本嗎？此操作無法復原。")) {
        progress = {};
        saveProgress(progress);
        renderStats();
        renderQuizList();
      }
    });
  });
})();
