// 學習歷程檔案生成器
document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);
  const preview = $("pf-preview");

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
  function multiline(str) {
    return escapeHTML(str).replace(/\n/g, "<br/>");
  }

  function generate() {
    const title = $("pf-title").value.trim() || "（尚未填寫研究題目）";
    const author = $("pf-author").value.trim() || "（尚未填寫姓名／班級）";
    const sections = [
      ["研究動機", $("pf-motivation").value],
      ["研究問題與假說", $("pf-question").value],
      ["實驗變因設計", $("pf-variables").value],
      ["實驗流程與方法", $("pf-method").value],
      ["結果與數據分析", $("pf-result").value],
      ["結論與反思", $("pf-conclusion").value],
    ];

    preview.innerHTML = `
      <h2>${escapeHTML(title)}</h2>
      <p style="color:#5a6b67;font-size:0.9rem;">${escapeHTML(author)}　｜　產生日期：${new Date().toLocaleDateString("zh-TW")}</p>
      ${sections
        .map(
          ([label, content]) => `
        <div class="rp-section">
          <div class="rp-label">${label}</div>
          <div>${content.trim() ? multiline(content) : "<span style=\"color:#9ca3af\">（尚未填寫）</span>"}</div>
        </div>
      `
        )
        .join("")}
      <div class="rp-section">
        <div class="rp-label">格式說明</div>
        <div style="font-size:0.82rem;color:#5a6b67;">本報告依探究與實作五步驟（問題→假說→設計→分析→結論）產生，可作為學習歷程檔案「多元表現」或「學習成果」項目之附件。</div>
      </div>
    `;
    preview.style.display = "block";
    preview.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("pf-generate").addEventListener("click", generate);
  $("pf-print").addEventListener("click", () => {
    if (preview.style.display === "none") generate();
    window.print();
  });
});
