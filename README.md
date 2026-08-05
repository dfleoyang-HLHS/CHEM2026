# ChemPlatform 化學教學平台

依據台灣高中化學 108 課綱設計的靜態網站，涵蓋「必修化學」與「選修化學 I–V」完整課程架構，提供學習地圖、互動實驗室、題庫評量、探究實作與 AI 家教等五大功能模組。

## 專案結構

```
index.html                首頁
pages/
  roadmap.html             學習地圖區（觀念圖譜 + 關鍵字搜尋）
  lab.html                 互動實驗室（3D分子模型 + 滴定/氣體/平衡模擬器）
  questions.html            題庫與智能評量（分級刷題 + 智慧錯題本）
  portfolio.html            探究實作與學習歷程（實作指引 + 報告產生器）
  community.html            AI家教與社群問答（引導式AI助教 + 討論區）
css/style.css              全站設計系統（含深色模式）
js/
  nav.js                    共用導覽列 / 頁尾
  curriculum-data.js        108課綱課程內容資料（必修 + 選修I-V）
  molecules-data.js         3D分子座標資料
  questions-data.js         題庫資料
  lab.js / questions.js / portfolio.js / community.js   各頁互動邏輯
```

## 本地預覽

純靜態網站，不需安裝任何套件。於專案根目錄執行：

```bash
python3 -m http.server 8000
```

再開啟瀏覽器造訪 `http://localhost:8000`。

## 技術說明

- 純 HTML / CSS / Vanilla JavaScript，無建置流程
- 3D 分子模型使用 [3Dmol.js](https://3dmol.org/)（CDN 載入），分子座標依鍵長鍵角理想化計算生成
- 題庫作答紀錄與錯題本、討論區貼文皆儲存於瀏覽器 `localStorage`，僅存於使用者本機
- AI 家教為關鍵字比對之示範版引導助教，正式上線可替換為串接大型語言模型 API 的版本

## 部署

可直接部署至 GitHub Pages（Settings → Pages → 選擇分支根目錄）或任何靜態網站託管服務。
