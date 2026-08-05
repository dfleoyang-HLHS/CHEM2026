// 全站共用 導覽列 / 頁尾 注入
(function () {
  const NAV_ITEMS = [
    { href: "/index.html", label: "首頁", key: "home" },
    { href: "/pages/roadmap.html", label: "學習地圖", key: "roadmap" },
    { href: "/pages/lab.html", label: "互動實驗室", key: "lab" },
    { href: "/pages/questions.html", label: "題庫與評量", key: "questions" },
    { href: "/pages/portfolio.html", label: "探究與歷程", key: "portfolio" },
    { href: "/pages/community.html", label: "AI家教與社群", key: "community" },
  ];

  function resolvePath(href) {
    // rootPath is set per-page (e.g. "" for index.html at root, "../" for pages/*.html)
    const root = window.CHEM_ROOT || "";
    return root + href.replace(/^\//, "");
  }

  function renderHeader() {
    const mount = document.getElementById("site-header");
    if (!mount) return;
    const current = window.CHEM_PAGE || "home";
    const links = NAV_ITEMS.map(
      (item) =>
        `<a href="${resolvePath(item.href)}" class="${item.key === current ? "active" : ""}">${item.label}</a>`
    ).join("");
    mount.innerHTML = `
      <div class="nav-bar">
        <a class="brand" href="${resolvePath("/index.html")}">
          <span class="brand-mark">⚗️</span>
          <span>ChemPlatform 化學教學平台</span>
        </a>
        <button class="nav-toggle" id="nav-toggle" aria-label="開啟選單">☰</button>
        <nav class="nav-links" id="nav-links">${links}</nav>
      </div>
    `;
    const toggle = document.getElementById("nav-toggle");
    const navLinks = document.getElementById("nav-links");
    toggle.addEventListener("click", () => navLinks.classList.toggle("open"));
  }

  function renderFooter() {
    const mount = document.getElementById("site-footer");
    if (!mount) return;
    mount.innerHTML = `
      <div class="container footer-inner">
        <div>
          <strong style="color: var(--color-text)">ChemPlatform</strong> — 依據 108 課綱設計之高中化學教學平台
          <div style="margin-top:6px">© ${new Date().getFullYear()} ChemPlatform．內容僅供教學參考，實驗操作請務必遵循教師指導與安全規範。</div>
        </div>
        <div class="footer-links">
          <a href="${resolvePath("/pages/roadmap.html")}">學習地圖</a>
          <a href="${resolvePath("/pages/lab.html")}">互動實驗室</a>
          <a href="${resolvePath("/pages/questions.html")}">題庫與評量</a>
          <a href="${resolvePath("/pages/portfolio.html")}">探究與歷程</a>
          <a href="${resolvePath("/pages/community.html")}">AI家教與社群</a>
        </div>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderHeader();
    renderFooter();
  });
})();
