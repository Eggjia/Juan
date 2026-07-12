# 胰島素與葡萄糖調節模擬器

這是一個給高中生使用的互動式生物課程 Web App。學生可以按下按鈕觀察「血糖上升」、「胰島素分泌」與「葡萄糖進入細胞」之間的關係。

本專案使用單一前端 HTML 檔案，加上 Vercel Serverless Functions 與 Google Apps Script，完成以下功能：

- 血糖與胰島素互動模擬
- 血管、細胞與葡萄糖粒子的圖像化顯示
- AI 家教對話框
- 使用者姓名與 email 登錄
- 操作 log 紀錄到 Google 試算表

> 注意：本模擬器是教學用簡化模型，不可用於醫療判斷。

## 專案結構

```text
.
├── index.html
├── api
│   ├── chat.js
│   └── save.js
├── _gs
│   └── Code.gs
├── README.md
├── log說明書.md
└── 胰島素與葡萄糖調節模擬器_程式設計規劃書.md
```

## 各檔案用途

`index.html`

前端主程式。包含 HTML、CSS、JavaScript。負責畫面、模擬邏輯、AI 家教 UI、使用者資料 modal，以及 log 暫存與送出。

`api/chat.js`

Vercel Serverless Function。前端 AI 家教會呼叫 `/api/chat`，再由這支 function 呼叫 OpenRouter。這樣 API key 不會暴露在前端。

`api/save.js`

Vercel Serverless Function。前端 log 會呼叫 `/api/save`，再由這支 function 把資料轉送到 Google Apps Script。

`_gs/Code.gs`

Google Apps Script 程式碼。放到 Google 試算表的 Apps Script 後，會接收 log 並寫入 `logSheet` 工作表。

`log說明書.md`

給初學者看的 log 機制說明文件。

## 主要功能

### 模擬器

- 初始血糖為 `90 mg/dL`
- 按 `A 攝取葡萄糖`，血糖增加，血管中葡萄糖粒子變多
- 按 `B 分泌胰島素`，胰島素相對量增加
- 胰島素作用時，血管中的葡萄糖粒子減少，並出現在細胞中
- Meter 會顯示血糖偏低、正常或偏高

### AI 家教

右下角有泡泡按鈕。點開後可以問 AI 家教問題，例如：

- 為什麼按 B 之後血糖會下降？
- 黃色粒子代表什麼？
- 胰島素和細胞有什麼關係？

前端只會呼叫：

```js
fetch("/api/chat")
```

OpenRouter API key 放在 Vercel 環境變數，不會寫在前端。

### 使用者資料

使用者進入頁面時會看到 modal，需要輸入：

- 姓名
- email

email 會做基本格式驗證。確認後，前端會把姓名與 email 存成變數：

```js
let userName = "";
let userEmail = "";
```

之後每一筆 log 都會帶上這兩個資料。

### 操作 log

前端會記錄使用者操作，例如：

- 登錄姓名與 email
- 點擊攝取葡萄糖
- 點擊分泌胰島素
- 點擊重新開始
- 開啟或關閉 AI 家教
- 送出 AI 家教問題
- AI 回覆成功或失敗

每滿 5 個事件，前端會送一筆資料到 `/api/save`。如果送出失敗，log 會保留在瀏覽器的 `localStorage`，下次再嘗試送出。

## 部署前準備

### 1. Google 試算表

目前 Apps Script 指向這份試算表：

```js
var SPREADSHEET_ID = "1nS85A8nEZ3Lr-9-XnnYlq7Br0v-lIyaiZDx65f3W16k";
```

請確認試算表中有一個工作表分頁叫：

```text
logSheet
```

建議第一列可以放欄位名稱：

```text
timeStamp | userName | userEmail | log
```

### 2. 設定 Google Apps Script

1. 開啟 Google 試算表
2. 點選「擴充功能」→「Apps Script」
3. 將 `_gs/Code.gs` 的內容貼進 Apps Script
4. 儲存
5. 部署為 Web App
6. 執行身分選「我」
7. 存取權限依需求選擇，常見測試設定是「知道連結的任何人」
8. 部署後取得 `/exec` 結尾的 Web App URL

這個 Web App URL 要放到 Vercel 的 `GAS_URL`。

### 3. Vercel 環境變數

在 Vercel Project 中設定：

```env
OPENROUTER_API_KEY=你的 OpenRouter API Key
AI_MODEL=openai/gpt-oss-120b:free
GAS_URL=你的 Google Apps Script Web App /exec URL
```

`AI_MODEL` 可以不填，不填時預設使用：

```text
openai/gpt-oss-120b:free
```

設定環境變數後，請重新部署 Vercel。舊的 deployment 不會自動吃到新變數。

## 本機開發

如果只想看前端模擬器，可以直接打開：

```text
index.html
```

但以下功能需要 Vercel runtime 才能正常運作：

- `/api/chat`
- `/api/save`
- AI 家教
- log 送到 GAS

本機測試 Vercel functions 可使用：

```bash
npx vercel dev
```

然後開啟：

```text
http://localhost:3000
```

## API 說明

### POST `/api/chat`

用途：AI 家教。

前端送出：

```json
{
  "message": "學生問題與目前模擬器情境"
}
```

回傳：

```json
{
  "reply": "AI 回覆"
}
```

### POST `/api/save`

用途：儲存 log。

前端送出：

```json
{
  "userName": "王小明",
  "userEmail": "student@example.com",
  "log": "[...]"
}
```

`api/save.js` 會把資料轉送給 `process.env.GAS_URL`。

成功時 GAS 會回傳：

```text
OK
```

## 常見問題

### AI 家教顯示連線失敗

請檢查：

- 是否用 Vercel 或 `npx vercel dev` 開啟，而不是直接雙擊 `index.html`
- Vercel 是否設定 `OPENROUTER_API_KEY`
- 設定環境變數後是否重新部署

### log 沒有寫進試算表

請檢查：

- Vercel 是否設定 `GAS_URL`
- `GAS_URL` 是否是 Apps Script Web App 的 `/exec` URL
- 試算表是否有 `logSheet`
- Apps Script Web App 權限是否允許被 Vercel 呼叫

### 試算表出現錯誤訊息

`Code.gs` 會回傳 exact 錯誤訊息。常見錯誤：

- `Sheet "logSheet" not found`
- `Missing POST body`
- Apps Script 權限未授權

## 隱私提醒

本專案會收集使用者姓名、email 與操作紀錄。若用於正式教學，請先告知學生資料用途，並遵守學校或單位的資料保護規範。
