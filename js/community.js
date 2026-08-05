// AI 化學解題助手（關鍵字比對示範版）＋ 討論區 / 許願池
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initChat();
  initBoard();
});

function initTabs() {
  const tabs = document.querySelectorAll("#community-tabs .tab-btn");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("ai-panel").style.display = btn.dataset.panel === "ai" ? "block" : "none";
      document.getElementById("board-panel").style.display = btn.dataset.panel === "board" ? "block" : "none";
    });
  });
}

/* ---------------- AI 解題助手 ---------------- */
function initChat() {
  const messagesEl = document.getElementById("chat-messages");
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");

  const FORMULA_HINTS = {
    NH3: "NH₃ 的中心原子 N 有幾個鍵結對？幾個孤對電子？試著用 VSEPR 理論的電子群數規則，推推看整體會是什麼形狀，再想想孤對電子如何影響鍵角。",
    H2O: "水分子中心原子 O 有 2 個鍵結對與 2 個孤對電子。你能說出電子群數是多少嗎？孤對電子的排斥力和鍵結對相比誰比較強？這會如何影響鍵角？",
    CO2: "CO₂ 中心原子 C 有幾個孤對電子？如果沒有孤對電子，電子群會盡量互相遠離，你覺得分子會是什麼形狀？這個形狀是否具有對稱性？對稱性和分子極性有什麼關係？",
    CH4: "甲烷中心原子 C 有 4 個鍵結對、沒有孤對電子。查表看看電子群數為 4 時，理想鍵角是多少度？",
    SF6: "SF₆ 中心原子 S 用了「擴展八隅體」，鍵結對數是多少？想想八面體形狀的鍵角會是幾度？",
  };

  const CONCEPT_HINTS = [
    {
      keys: ["勒沙特列", "le chatelier", "平衡移動"],
      hint: "先問自己：這個外在改變（濃度／壓力／溫度）會讓正反應還是逆反應的速率暫時變快？平衡永遠會朝「抵銷」這個改變的方向移動——試著自己判斷看看方向，而不是直接背結論喔。",
      topicId: "e2-2-2",
    },
    {
      keys: ["軌域", "電子組態", "orbital"],
      hint: "先數一數這個原子的電子總數（等於原子序），再依照 1s → 2s → 2p → 3s → 3p...的順序，每個軌域最多放幾個電子？試著自己依序填填看。",
      topicId: "e1-1-1",
    },
    {
      keys: ["ph值", "ph 值", " ph", "ph="],
      hint: "先想想題目給的是強酸還是弱酸？強酸強鹼通常視為完全解離，可以直接用濃度算 [H+]；弱酸則需要用 Ka 建立 ICE 表求解。你能先寫出這個酸的解離反應式嗎？",
      topicId: "e3-1-1",
    },
    {
      keys: ["氧化數", "氧化還原", "redox"],
      hint: "試著先幫每個原子標出氧化數：單質是 0，化合物中氧通常 −2、氫通常 +1。哪個原子的氧化數上升了？哪個下降了？上升的就是被氧化。",
      topicId: "e3-3-1",
    },
    {
      keys: ["滴定曲線", "當量點", "titration"],
      hint: "先想想是強酸強鹼還是弱酸強鹼滴定？當量點的定義是「酸鹼莫耳數恰好相等」，這和 pH 值是否等於 7 是兩件不同的事喔——弱酸被滴定時，當量點的鹽類會怎麼水解？",
      topicId: "e3-1-3",
    },
    {
      keys: ["ksp", "溶解度積", "沉澱"],
      hint: "先寫出這個難溶鹽的解離平衡式，再列出 Ksp 的表示式。接著計算目前溶液中離子濃度的乘積 Q，再和 Ksp 比較大小，就可以判斷會不會沉澱囉。",
      topicId: "e3-2-1",
    },
    {
      keys: ["限量試劑", "limiting"],
      hint: "試著先寫出平衡的化學反應式，把每個反應物的莫耳數除以它在反應式中的係數，數值最小的那個就是限量試劑——你要不要自己代入數字算算看？",
      topicId: "req-2-1",
    },
    {
      keys: ["緩衝溶液", "buffer", "henderson"],
      hint: "緩衝溶液的 pH 可以用亨德森-哈索巴赫方程式估算：pH = pKa + log([共軛鹼]/[弱酸])。你能先找出這個系統中弱酸和共軛鹼分別是誰、莫耳數各是多少嗎？",
      topicId: "e3-1-2",
    },
    {
      keys: ["反應速率", "rate law", "速率定律"],
      hint: "速率定律式必須由實驗數據決定，不能直接看化學計量係數。比較兩組實驗中，當某個反應物濃度改變、其他不變時，速率變化了幾倍，就能推出對該反應物的反應級數。",
      topicId: "e2-1-1",
    },
  ];

  function addMessage(text, who) {
    const div = document.createElement("div");
    div.className = `chat-msg ${who}`;
    div.innerHTML = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function respond(userText) {
    const raw = userText.trim();
    const upper = raw.toUpperCase().replace(/\s+/g, "");
    const lower = raw.toLowerCase();

    if (FORMULA_HINTS[upper]) {
      return `${FORMULA_HINTS[upper]}<br/><br/>想直接看完整觀念整理？<a href="roadmap.html">前往學習地圖 →</a>`;
    }

    for (const item of CONCEPT_HINTS) {
      if (item.keys.some((k) => lower.includes(k))) {
        return `${item.hint}<br/><br/>相關觀念小卡：<a href="roadmap.html#${item.topicId}">點我查看 →</a>`;
      }
    }

    return `這是示範版助教，目前僅能針對題庫中收錄的觀念關鍵字（如分子式 NH3/H2O/CO2、或「勒沙特列」「pH值」「氧化數」「Ksp」等）提供引導提示。你可以換個關鍵字試試，或到<a href="roadmap.html">學習地圖</a>直接搜尋，也可以到討論區發問讓真人教師與同學協助！`;
  }

  function send() {
    const text = input.value.trim();
    if (!text) return;
    addMessage(escapeHTML(text), "user");
    input.value = "";
    setTimeout(() => {
      addMessage(respond(text), "bot");
    }, 350);
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  sendBtn.addEventListener("click", send);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") send();
  });

  addMessage(
    "嗨！我是 AI 化學解題助手 👋 試著輸入化學式（如 NH3）或觀念關鍵字（如「勒沙特列」），我會用提問引導你自己想通答案，而不是直接告訴你結果喔！",
    "bot"
  );
}

/* ---------------- 討論區 / 許願池 ---------------- */
function initBoard() {
  const STORAGE_KEY = "chem_board_posts_v1";
  const tagSelect = document.getElementById("board-tag");
  const listEl = document.getElementById("board-list");

  const subjectTags = Object.values(CURRICULUM).map((s) => s.title);
  tagSelect.innerHTML = subjectTags.map((t) => `<option value="${t}">${t}</option>`).join("");

  const seedPosts = [
    {
      id: "seed-1",
      name: "高二仁_佳穎",
      tag: "選修化學 III",
      title: "為什麼弱酸強鹼滴定的當量點 pH 會大於 7？",
      content: "課本說鹽類水解，但我不太懂醋酸根為什麼會讓溶液變鹼性，有人可以說明一下反應式嗎？",
      time: "3 天前",
      replies: [{ name: "陳老師", text: "可以想成 CH3COO- + H2O ⇌ CH3COOH + OH-，醋酸根是弱酸的共軛鹼，會搶水中的 H+，因此釋出 OH- 使溶液偏鹼性喔！" }],
    },
    {
      id: "seed-2",
      name: "高一信_柏宇",
      tag: "必修化學",
      title: "限量試劑要怎麼快速判斷？",
      content: "每次遇到限量試劑的題目都要算很久，有沒有比較快的判斷方法？",
      time: "1 週前",
      replies: [{ name: "同學 _雨柔", text: "我都是把各反應物的莫耳數除以係數，數字最小的那個就是限量試劑，蠻好用的！" }],
    },
    {
      id: "seed-3",
      name: "高三愛_思妤",
      tag: "選修化學 IV",
      title: "酯化反應是可逆反應嗎？怎麼提高產率？",
      content: "想請問酯化反應如果是可逆的，實驗上都怎麼提高酯的產率呢？",
      time: "2 週前",
      replies: [],
    },
  ];

  function loadPosts() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return stored && stored.length ? stored : seedPosts;
    } catch {
      return seedPosts;
    }
  }
  function savePosts(posts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }

  let posts = loadPosts();

  function render() {
    if (posts.length === 0) {
      listEl.innerHTML = `<div class="empty-state">目前還沒有提問，成為第一個發問的人吧！</div>`;
      return;
    }
    listEl.innerHTML = posts
      .map(
        (p) => `
      <div class="board-post">
        <div class="post-meta"><span class="tag-pill">${p.tag}</span>${p.name}．${p.time}</div>
        <h4>${p.title}</h4>
        <p>${p.content}</p>
        ${
          p.replies && p.replies.length
            ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--color-border);">` +
              p.replies
                .map((r) => `<p style="font-size:0.85rem;"><strong>${r.name}：</strong>${r.text}</p>`)
                .join("") +
              `</div>`
            : `<div style="margin-top:8px;font-size:0.8rem;color:var(--color-text-muted);">尚無回覆，等待教師或同學解答中...</div>`
        }
      </div>
    `
      )
      .join("");
  }

  document.getElementById("board-submit").addEventListener("click", () => {
    const name = document.getElementById("board-name").value.trim() || "匿名同學";
    const tag = tagSelect.value;
    const title = document.getElementById("board-title").value.trim();
    const content = document.getElementById("board-content").value.trim();
    if (!title || !content) {
      alert("請填寫問題標題與內容再發布喔！");
      return;
    }
    posts.unshift({
      id: "post-" + Date.now(),
      name,
      tag,
      title,
      content,
      time: "剛剛",
      replies: [],
    });
    savePosts(posts);
    document.getElementById("board-title").value = "";
    document.getElementById("board-content").value = "";
    render();
  });

  render();
}
