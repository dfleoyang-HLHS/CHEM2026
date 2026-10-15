// 互動實驗室：3D 分子模型 + 滴定曲線 + 氣體模擬 + 化學平衡模擬
document.addEventListener("DOMContentLoaded", () => {
  initLabPanelSwitcher();
  initMoleculeViewer();
  initTitrationSimulator();
  initGasSimulator();
  initEquilibriumSimulator();
  initExperimentsGrid();
});

/* ========== 0. 互動單元下拉選單切換 ========== */
function initLabPanelSwitcher() {
  const select = document.getElementById("lab-panel-select");
  const panels = document.querySelectorAll(".lab-panel[data-lab-panel]");

  function showPanel(key) {
    panels.forEach((p) => {
      p.classList.toggle("active", p.dataset.labPanel === key);
    });
  }

  select.addEventListener("change", () => showPanel(select.value));
  showPanel(select.value);
}

/* ========== 1. 3D 分子模型 ========== */
function initMoleculeViewer() {
  const select = document.getElementById("mol-select");
  const styleSelect = document.getElementById("style-select");
  const shapeEl = document.getElementById("mol-shape");
  const noteEl = document.getElementById("mol-note");
  const legendEl = document.getElementById("mol-legend");

  Object.entries(MOLECULES).forEach(([key, mol]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = mol.label;
    select.appendChild(opt);
  });

  let viewer = null;
  if (window.$3Dmol) {
    viewer = $3Dmol.createViewer(document.getElementById("molviewer"), {
      backgroundColor: "0x0b0f10",
    });
  }

  const ELEMENT_COLORS = {
    H: "#e5e7eb",
    C: "#4b5563",
    O: "#ef4444",
    N: "#3b82f6",
    S: "#eab308",
    F: "#22c55e",
    B: "#f472b6",
  };

  function renderLegend(xyz) {
    const elements = new Set();
    xyz
      .split("\n")
      .slice(2)
      .forEach((line) => {
        const sym = line.trim().split(/\s+/)[0];
        if (sym) elements.add(sym);
      });
    legendEl.innerHTML = [...elements]
      .map(
        (el) =>
          `<span><span class="mol-dot" style="background:${ELEMENT_COLORS[el] || "#999"}"></span>${el}</span>`
      )
      .join("");
  }

  function loadMolecule(key) {
    const mol = MOLECULES[key];
    if (!mol) return;
    shapeEl.textContent = `${mol.label} — ${mol.shape}`;
    noteEl.textContent = mol.note;
    renderLegend(mol.xyz);

    if (!viewer) return;
    viewer.clear();
    viewer.addModel(mol.xyz, "xyz");
    applyStyle();
    viewer.zoomTo();
    viewer.render();
  }

  function applyStyle() {
    if (!viewer) return;
    const style = styleSelect.value;
    viewer.setStyle({}, {});
    if (style === "stick") {
      viewer.setStyle({}, { stick: { radius: 0.14, colorscheme: "Jmol" } });
    } else if (style === "spacefill") {
      viewer.setStyle({}, { sphere: { scale: 0.9, colorscheme: "Jmol" } });
    } else {
      viewer.setStyle(
        {},
        { stick: { radius: 0.12, colorscheme: "Jmol" }, sphere: { scale: 0.28, colorscheme: "Jmol" } }
      );
    }
    viewer.render();
  }

  select.addEventListener("change", () => loadMolecule(select.value));
  styleSelect.addEventListener("change", applyStyle);

  select.value = "H2O";
  loadMolecule("H2O");
}

/* ========== 2. 酸鹼滴定曲線模擬器 ========== */
function initTitrationSimulator() {
  const els = {
    type: document.getElementById("titr-acid-type"),
    cAcid: document.getElementById("titr-cacid"),
    vAcid: document.getElementById("titr-vacid"),
    cBase: document.getElementById("titr-cbase"),
    cAcidVal: document.getElementById("titr-cacid-val"),
    vAcidVal: document.getElementById("titr-vacid-val"),
    cBaseVal: document.getElementById("titr-cbase-val"),
    summary: document.getElementById("titr-summary"),
  };
  const canvas = document.getElementById("titr-canvas");
  const ctx = canvas.getContext("2d");
  const KA_ACETIC = 1.8e-5;
  const KW = 1e-14;

  function pHStrong(cAcid, vAcid, cBase, vBase) {
    const molAcid = cAcid * vAcid;
    const molBase = cBase * vBase;
    const totalV = vAcid + vBase;
    const diff = molAcid - molBase;
    if (diff > 1e-9) {
      return -Math.log10(diff / totalV);
    } else if (diff < -1e-9) {
      const pOH = -Math.log10(-diff / totalV);
      return 14 - pOH;
    }
    return 7;
  }

  function pHWeak(cAcid, vAcid, cBase, vBase, Ka) {
    const molAcid0 = cAcid * vAcid;
    const molBase = cBase * vBase;
    const totalV = vAcid + vBase;
    const threshold = Math.max(molAcid0 * 0.004, 1e-6);

    if (vBase === 0) {
      const C = cAcid;
      const a = 1, b = Ka, c = -Ka * C;
      const x = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
      return -Math.log10(x);
    }
    const diff = molAcid0 - molBase;
    if (diff > threshold) {
      const molHA = diff;
      const molA = molBase;
      const pKa = -Math.log10(Ka);
      return Math.max(0, Math.min(14, pKa + Math.log10(molA / molHA)));
    } else if (diff >= -threshold) {
      const concA = molAcid0 / totalV;
      const Kb = KW / Ka;
      const a = 1, b = Kb, c = -Kb * concA;
      const x = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
      const pOH = -Math.log10(x);
      return 14 - pOH;
    } else {
      const excess = molBase - molAcid0;
      const pOH = -Math.log10(excess / totalV);
      return Math.max(0, 14 - pOH);
    }
  }

  function computeCurve() {
    const type = els.type.value;
    const cAcid = parseFloat(els.cAcid.value);
    const vAcid = parseFloat(els.vAcid.value);
    const cBase = parseFloat(els.cBase.value);
    const Ve = (cAcid * vAcid) / cBase;
    const maxVb = Ve * 2.2;
    const steps = 220;
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const vb = (maxVb * i) / steps;
      const pH =
        type === "strong"
          ? pHStrong(cAcid, vAcid, cBase, vb)
          : pHWeak(cAcid, vAcid, cBase, vb, KA_ACETIC);
      points.push({ vb, pH: Math.max(0, Math.min(14, pH)) });
    }
    return { points, Ve };
  }

  function draw() {
    const { points, Ve } = computeCurve();
    const W = canvas.width, H = canvas.height;
    const padL = 50, padB = 40, padT = 20, padR = 20;
    ctx.clearRect(0, 0, W, H);

    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    ctx.strokeStyle = isDark ? "#2a3733" : "#dde7e4";
    ctx.fillStyle = isDark ? "#9db3ad" : "#5a6b67";
    ctx.font = "11px sans-serif";

    const maxVb = points[points.length - 1].vb;
    const xScale = (v) => padL + (v / maxVb) * (W - padL - padR);
    const yScale = (pH) => H - padB - (pH / 14) * (H - padT - padB);

    // grid + axes
    ctx.beginPath();
    for (let pH = 0; pH <= 14; pH += 2) {
      const y = yScale(pH);
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.fillText(pH, 20, y + 4);
    }
    ctx.stroke();

    ctx.strokeStyle = isDark ? "#eaf2f0" : "#16221f";
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, H - padB);
    ctx.lineTo(W - padR, H - padB);
    ctx.stroke();
    ctx.fillText("pH", 12, padT);
    ctx.fillText("加入 NaOH 體積 (mL)", W / 2 - 50, H - 8);

    // equivalence marker
    const exVx = xScale(Ve);
    ctx.strokeStyle = "#f59e0b";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(exVx, padT);
    ctx.lineTo(exVx, H - padB);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#f59e0b";
    ctx.fillText(`當量點 Ve≈${Ve.toFixed(1)}mL`, exVx + 4, padT + 12);

    // curve
    ctx.strokeStyle = "#14b8a6";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xScale(p.vb), y = yScale(p.pH);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function updateReadouts() {
    els.cAcidVal.textContent = els.cAcid.value + " M";
    els.vAcidVal.textContent = els.vAcid.value + " mL";
    els.cBaseVal.textContent = els.cBase.value + " M";
    const type = els.type.value === "strong" ? "強酸-強鹼滴定：當量點 pH = 7" : "弱酸-強鹼滴定：當量點 pH > 7（醋酸根水解）";
    els.summary.textContent = type;
    draw();
  }

  [els.type, els.cAcid, els.vAcid, els.cBase].forEach((el) =>
    el.addEventListener("input", updateReadouts)
  );
  updateReadouts();
  window.addEventListener("resize", draw);
}

/* ========== 3. 氣體分子運動模擬器 ========== */
function initGasSimulator() {
  const els = {
    temp: document.getElementById("gas-temp"),
    vol: document.getElementById("gas-vol"),
    n: document.getElementById("gas-n"),
    tempVal: document.getElementById("gas-temp-val"),
    volVal: document.getElementById("gas-vol-val"),
    nVal: document.getElementById("gas-n-val"),
    readout: document.getElementById("gas-readout"),
  };
  const canvas = document.getElementById("gas-canvas");
  const ctx = canvas.getContext("2d");
  const R = 0.0821;

  let particles = [];

  function boxRect() {
    const volPct = parseFloat(els.vol.value) / 100;
    const maxW = canvas.width - 60, maxH = canvas.height - 60;
    const w = maxW * (0.4 + 0.6 * volPct);
    const h = maxH * (0.4 + 0.6 * volPct);
    return {
      x: (canvas.width - w) / 2,
      y: (canvas.height - h) / 2,
      w,
      h,
    };
  }

  function rebuildParticles() {
    const n = parseInt(els.n.value, 10);
    const count = n * 16;
    const box = boxRect();
    particles = [];
    for (let i = 0; i < count; i++) {
      const speed = particleSpeed();
      const angle = Math.random() * Math.PI * 2;
      particles.push({
        x: box.x + Math.random() * box.w,
        y: box.y + Math.random() * box.h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      });
    }
  }

  function particleSpeed() {
    const T = parseFloat(els.temp.value);
    return 0.25 * Math.sqrt(T / 100);
  }

  function updateReadouts() {
    els.tempVal.textContent = els.temp.value + " K";
    els.volVal.textContent = els.vol.value + " (相對單位)";
    els.nVal.textContent = els.n.value + " mol";

    const T = parseFloat(els.temp.value);
    const n = parseFloat(els.n.value);
    const volL = parseFloat(els.vol.value) / 10; // 相對單位換算為公升，僅供教學示意
    const P = (n * R * T) / volL;
    els.readout.innerHTML = `依 PV = nRT 計算：P ≈ <strong style="color:var(--color-primary)">${P.toFixed(2)} atm</strong>（V ≈ ${volL.toFixed(1)} L，僅供教學示意換算）`;

    const speed = particleSpeed();
    particles.forEach((p) => {
      const currentSpeed = Math.hypot(p.vx, p.vy) || 1;
      const scale = speed / currentSpeed;
      p.vx *= scale;
      p.vy *= scale;
    });
  }

  function step() {
    const box = boxRect();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    ctx.strokeStyle = isDark ? "#5eead4" : "#0f766e";
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.lineWidth = 1;

    ctx.fillStyle = isDark ? "#5eead4" : "#0f766e";
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < box.x || p.x > box.x + box.w) p.vx *= -1;
      if (p.y < box.y || p.y > box.y + box.h) p.vy *= -1;
      p.x = Math.max(box.x, Math.min(box.x + box.w, p.x));
      p.y = Math.max(box.y, Math.min(box.y + box.h, p.y));
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(step);
  }

  els.temp.addEventListener("input", updateReadouts);
  els.vol.addEventListener("input", () => {
    rebuildParticles();
    updateReadouts();
  });
  els.n.addEventListener("input", () => {
    rebuildParticles();
    updateReadouts();
  });

  rebuildParticles();
  updateReadouts();
  requestAnimationFrame(step);
}

/* ========== 4. 化學平衡動態模擬器 ========== */
function initEquilibriumSimulator() {
  const K = 4.63; // N2O4(g) <=> 2NO2(g), 25°C
  const els = {
    a0: document.getElementById("eq-a0"),
    b0: document.getElementById("eq-b0"),
    a0Val: document.getElementById("eq-a0-val"),
    b0Val: document.getElementById("eq-b0-val"),
    solve: document.getElementById("eq-solve"),
    readout: document.getElementById("eq-readout"),
  };
  const canvas = document.getElementById("eq-canvas");
  const ctx = canvas.getContext("2d");

  function solveEquilibrium(a0, b0) {
    const A = 4, B = 4 * b0 + K, C = b0 * b0 - K * a0;
    const disc = Math.max(B * B - 4 * A * C, 0);
    const sqrtDisc = Math.sqrt(disc);
    const candidates = [(-B + sqrtDisc) / (2 * A), (-B - sqrtDisc) / (2 * A)].filter(
      (x) => a0 - x >= -1e-9 && b0 + 2 * x >= -1e-9
    );
    const x = candidates.length ? candidates[0] : 0;
    return { eqA: Math.max(a0 - x, 0), eqB: Math.max(b0 + 2 * x, 0), x };
  }

  function draw() {
    const a0 = parseFloat(els.a0.value);
    const b0 = parseFloat(els.b0.value);
    const Q = a0 > 0 ? (b0 * b0) / a0 : Infinity;
    const { eqA, eqB } = solveEquilibrium(a0, b0);

    const direction =
      Q < K ? "Q < K，平衡向右移動（N₂O₄ 轉為 NO₂）" : Q > K ? "Q > K，平衡向左移動（NO₂ 轉為 N₂O₄）" : "Q = K，系統已達平衡";

    els.readout.innerHTML = `
      初始 Q = ${isFinite(Q) ? Q.toFixed(2) : "∞"}．平衡常數 K = ${K}<br/>
      <strong style="color:var(--color-primary)">${direction}</strong><br/>
      平衡時 [N₂O₄] ≈ ${eqA.toFixed(3)} M，[NO₂] ≈ ${eqB.toFixed(3)} M
    `;

    const W = canvas.width, H = canvas.height;
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = isDark ? "#9db3ad" : "#5a6b67";
    ctx.font = "12px sans-serif";

    const maxVal = Math.max(a0, b0, eqA, eqB, 0.5) * 1.2;
    const bars = [
      { label: "N₂O₄ 初始", val: a0, color: "#94a3b8" },
      { label: "NO₂ 初始", val: b0, color: "#cbd5e1" },
      { label: "N₂O₄ 平衡", val: eqA, color: "#0f766e" },
      { label: "NO₂ 平衡", val: eqB, color: "#14b8a6" },
    ];
    const barW = 90, gap = 40, startX = 60, baseY = H - 50, maxBarH = H - 100;
    bars.forEach((b, i) => {
      const x = startX + i * (barW + gap);
      const barH = (b.val / maxVal) * maxBarH;
      ctx.fillStyle = b.color;
      ctx.fillRect(x, baseY - barH, barW, barH);
      ctx.fillStyle = isDark ? "#eaf2f0" : "#16221f";
      ctx.fillText(b.val.toFixed(2) + " M", x + 6, baseY - barH - 8);
      ctx.fillStyle = isDark ? "#9db3ad" : "#5a6b67";
      ctx.fillText(b.label, x, baseY + 18);
    });

    ctx.strokeStyle = isDark ? "#eaf2f0" : "#16221f";
    ctx.beginPath();
    ctx.moveTo(startX - 10, baseY);
    ctx.lineTo(startX + bars.length * (barW + gap), baseY);
    ctx.stroke();
  }

  function updateReadouts() {
    els.a0Val.textContent = parseFloat(els.a0.value).toFixed(2) + " M";
    els.b0Val.textContent = parseFloat(els.b0.value).toFixed(2) + " M";
    draw();
  }

  els.a0.addEventListener("input", updateReadouts);
  els.b0.addEventListener("input", updateReadouts);
  els.solve.addEventListener("click", draw);
  updateReadouts();
}

/* ========== 5. 實驗影片與操作規範清單 ========== */
function initExperimentsGrid() {
  const grid = document.getElementById("experiments-grid");
  const experiments = [
    {
      title: "阿斯匹靈的合成",
      unit: "選修化學 IV．酯化反應",
      danger: "使用濃硫酸／磷酸為催化劑，具腐蝕性，須配戴護目鏡與手套操作。",
      tip: "水楊酸與乙酸酐反應生成乙醯柳酸（阿斯匹靈），可透過重結晶提純並以熔點測定純度。",
    },
    {
      title: "高錳酸鉀氧化還原滴定",
      unit: "選修化學 III．氧化還原滴定",
      danger: "KMnO₄ 具強氧化性，接觸皮膚會留下棕色污漬，避免直接接觸。",
      tip: "利用 MnO₄⁻ 本身顏色自身指示滴定終點，適合測定 Fe²⁺ 或 H₂O₂ 濃度。",
    },
    {
      title: "酸鹼中和滴定",
      unit: "必修化學．水溶液中的反應",
      danger: "強酸強鹼具腐蝕性，滴定管操作須避免眼睛與皮膚接觸。",
      tip: "正確判讀滴定管刻度、掌握滴定終點指示劑變色瞬間是本實驗關鍵技巧。",
    },
    {
      title: "銅的電鍍實驗",
      unit: "選修化學 III．電解與電鍍",
      danger: "電解液含硫酸銅，避免誤食；操作電源供應器時注意電線絕緣。",
      tip: "觀察陰極增重、陽極減重的現象，驗證法拉第定律的定量關係。",
    },
    {
      title: "薄層層析分離色素",
      unit: "必修化學．混合物分離",
      danger: "展開液多為有機溶劑，具揮發性與可燃性，須於通風處操作、遠離火源。",
      tip: "計算滯留因子 Rf 值以鑑定成分，是層析分析的基本定量指標。",
    },
    {
      title: "分光光度計檢量線繪製",
      unit: "選修化學 V．儀器分析",
      danger: "注意樣品槽（比色管）清潔，避免指紋油漬影響吸光度讀值。",
      tip: "以已知濃度系列標準液繪製吸光度-濃度檢量線，用於推算未知樣品濃度。",
    },
  ];
  grid.innerHTML = experiments
    .map(
      (e) => `
    <div class="card">
      <div class="card-icon" style="background:#fee2e2;color:#b91c1c;">⚠️</div>
      <h3>${e.title}</h3>
      <p style="color:var(--color-primary-dark);font-weight:700;font-size:0.8rem;">${e.unit}</p>
      <p><strong>危險點：</strong>${e.danger}</p>
      <p><strong>操作技巧：</strong>${e.tip}</p>
    </div>
  `
    )
    .join("");
}
