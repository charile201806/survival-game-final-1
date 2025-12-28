# Z-ZONE 戰術指揮中心 (v2.5)

這是一個專為現實大逃殺、殭屍生存遊戲設計的實時戰況追蹤系統。透過雲端廣播功能，管理員可以即時更新玩家狀態，觀戰者則可透過專屬連結獲得最新戰情。

## 🚀 快速開始

### 1. 環境需求
- 安裝 [Node.js](https://nodejs.org/) (建議 v18 以上版本)。

### 2. 安裝與執行
```bash
# 安裝依賴套件
npm install

# 啟動開發環境
npm run dev
```

### 3. 使用方法
- **管理員模式**：點擊右上角 Lock 圖示，輸入密碼 `admin`。
- **開啟雲端**：登入後點擊「建立雲端頻道」，系統會自動產生一個帶有 `?room=xxxx` 的專屬網址。
- **分享連結**：將產生後的網址分享給參賽者或觀戰者，他們即可看到實時更新。

## 🛠️ 技術架構
- **前端框架**: React 19 + TypeScript
- **樣式設計**: Tailwind CSS (Cyberpunk Style)
- **圖標庫**: Lucide React
- **AI 戰報**: Google Gemini API
- **數據同步**: npoint.io JSON Storage

## 📦 部署至 GitHub Pages
1. 在 `package.json` 中確認 `"homepage"` 設定（若使用自定義網域可忽略）。
2. 執行 `npm run deploy`。
3. 在 GitHub 倉庫設定中將 GitHub Pages 的來源設為 `gh-pages` 分支。

---
*本專案僅供遊戲與戰術模擬使用，請確保網路連線穩定以獲得最佳同步體驗。*