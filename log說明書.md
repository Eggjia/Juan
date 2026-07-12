# Log 說明書：給初學者的操作紀錄指南

這份文件用比較白話的方式說明本專案的 log 機制。你可以把 log 想成「使用者在網頁上的操作紀錄」。

例如學生做了這些事：

- 輸入姓名與 email
- 按下「攝取葡萄糖」
- 按下「分泌胰島素」
- 打開 AI 家教
- 問 AI 家教一個問題

這些都可以被記錄成 log。

## 為什麼要記錄 log？

這個模擬器是教學工具。老師可能會想知道：

- 學生有沒有真的操作模擬器
- 學生先按了哪個按鈕
- 學生是否觀察到胰島素讓血糖下降
- 學生問 AI 家教什麼問題
- 學生操作時血糖數值大約是多少

log 的目的不是監控學生，而是留下學習歷程，幫助老師了解學生怎麼探索這個概念。

## 本專案的 log 流程

整個流程可以想成五個步驟：

```text
學生操作網頁
  ↓
前端產生 log
  ↓
先存在瀏覽器 localStorage
  ↓
每滿 5 個事件送到 /api/save
  ↓
Vercel 轉送到 GAS，最後寫入 Google 試算表
```

一開始看起來有點長，但每一段都有自己的工作。

## 角色分工

### 1. 前端 index.html

前端就是學生看到的網頁。

它負責：

- 顯示模擬器畫面
- 接收學生操作
- 建立 log
- 暫存 log
- 把 log 送到 `/api/save`

### 2. Vercel 的 api/save.js

`api/save.js` 是中間代理。

它負責：

- 接收前端送來的 log
- 從 `process.env.GAS_URL` 讀取 Apps Script URL
- 把 log 轉送到 Google Apps Script
- 把 GAS 的結果回傳給前端

為什麼要有中間代理？

因為我們不希望把 GAS Web App URL 直接寫死在前端。前端的程式碼任何人都可以看到，所以比較敏感的 URL 或金鑰最好放在伺服器環境變數中。

### 3. Google Apps Script 的 Code.gs

`_gs/Code.gs` 是放在 Google 試算表 Apps Script 裡的程式。

它負責：

- 接收 Vercel 轉送來的資料
- 找到 `logSheet` 工作表
- 用 `appendRow` 寫入一列資料
- 成功回傳 `OK`
- 失敗回傳詳細錯誤訊息

### 4. Google 試算表

試算表是最後存資料的地方。

每一列長這樣：

```text
timeStamp | userName | userEmail | log
```

## 使用者資料怎麼來？

使用者進入網頁時，會先看到一個 modal。

modal 會要求輸入：

- 姓名
- email

前端會用這兩個變數接住：

```js
let userName = "";
let userEmail = "";
```

當使用者按下「確認並開始」後：

```js
userName = nextUserName;
userEmail = nextUserEmail;
```

之後每一筆送到 GAS 的資料都會帶上這兩個欄位。

## email 驗證是什麼？

email 驗證是為了避免使用者輸入明顯錯誤的格式。

目前使用這個函式：

```js
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

這段意思大概是：

- email 裡要有 `@`
- `@` 前面要有文字
- `@` 後面要有文字
- 後面還要有一個 `.`，像 `.com` 或 `.tw`

這不是最嚴格的 email 檢查，但對教學用表單已經夠用。

## 什麼是 localStorage？

`localStorage` 是瀏覽器內建的小型儲存空間。

你可以把它想成瀏覽器裡的小記事本。資料存在使用者自己的瀏覽器裡，不會因為重新整理頁面就立刻消失。

本專案用它暫存尚未成功送出的 log：

```js
const LOG_STORAGE_KEY = "insulin-glucose-simulator.pendingLogs.v1";
```

為什麼要暫存？

因為網路可能失敗，GAS 可能暫時沒有回應，或 Vercel 環境變數可能還沒設定好。如果 log 一送失敗就丟掉，就會遺失資料。

所以本專案採用比較保守的做法：

- 先把 log 放進佇列
- 送出成功才刪掉
- 送出失敗就放回佇列

## 什麼是 logQueue？

`logQueue` 是前端用來排隊的陣列。

你可以把它想成「準備送去試算表的一疊小紙條」。

程式中會先讀取之前暫存的 log：

```js
let logQueue = loadLogQueue();
```

每次有新事件，就把事件放進去：

```js
logQueue.push(entry);
```

然後存回 `localStorage`：

```js
saveLogQueue();
```

## 每一筆 log 長什麼樣子？

前端會建立一個物件，大概像這樣：

```json
{
  "timeStamp": "2026-07-12T07:00:00.000Z",
  "eventType": "button_click:add_glucose",
  "detail": {
    "beforeGlucose": 90,
    "afterGlucose": 120
  },
  "simulation": {
    "glucose": 120,
    "insulin": 0,
    "cellGlucose": 0,
    "glucoseStatus": "正常範圍",
    "bloodParticles": 12,
    "cellParticles": 0
  }
}
```

### timeStamp

事件發生的時間。

### eventType

事件類型。用來知道學生做了什麼。

### detail

事件細節。不同事件會有不同內容。

例如按下攝取葡萄糖時，會記錄按之前與按之後的血糖。

### simulation

事件發生當下的模擬器狀態。

例如：

- 血糖多少
- 胰島素多少
- 細胞內葡萄糖多少
- 目前血糖狀態是偏低、正常或偏高
- 血管與細胞中各有多少葡萄糖粒子

## 目前會記錄哪些事件？

### `user_profile_confirmed`

使用者完成姓名與 email 輸入。

### `button_click:add_glucose`

使用者按下「A 攝取葡萄糖」。

### `button_click:release_insulin`

使用者按下「B 分泌胰島素」。

### `button_click:reset_simulation`

使用者按下「重新開始」。

### `chat_opened`

使用者打開 AI 家教。

### `chat_closed`

使用者關閉 AI 家教。

### `chat_message_submitted`

使用者送出 AI 家教問題。

### `chat_reply_received`

AI 家教成功回覆。

### `chat_reply_failed`

AI 家教回覆失敗，例如 API 或網路連線錯誤。

## 為什麼每 5 個事件才送一次？

如果每按一下就馬上送到 GAS，可能會造成太多請求。

每 5 個事件送一次有幾個好處：

- 減少網路請求次數
- 減少 Apps Script 壓力
- 使用者操作比較順
- 就算暫時失敗，也可以一起保留在佇列裡

目前設定是：

```js
const LOG_BATCH_SIZE = 5;
```

如果以後想改成每 10 個事件送一次，可以改成：

```js
const LOG_BATCH_SIZE = 10;
```

## log 怎麼送出？

前端呼叫：

```js
fetch("/api/save", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    userName,
    userEmail,
    log: JSON.stringify(batch)
  })
});
```

送出的資料有三個主要欄位：

```json
{
  "userName": "王小明",
  "userEmail": "student@example.com",
  "log": "[...]"
}
```

注意：`log` 裡面是一整批事件，所以它會是一段 JSON 字串。

## 為什麼前端不直接送 GAS？

本專案目前是：

```text
前端 → /api/save → GAS → Google 試算表
```

而不是：

```text
前端 → GAS → Google 試算表
```

原因是安全性與管理性。

透過 `/api/save` 有幾個好處：

- GAS URL 不需要寫在前端
- 以後可以在 Vercel function 加驗證
- 發生錯誤時比較容易集中處理
- 前端只需要知道 `/api/save`

## api/save.js 做了什麼？

`api/save.js` 會讀 Vercel 的環境變數：

```js
const gasUrl = process.env.GAS_URL;
```

然後把前端資料轉送到 GAS：

```js
const gasResponse = await fetch(gasUrl, {
  method: "POST",
  headers: {
    "Content-Type": "text/plain;charset=utf-8"
  },
  body: JSON.stringify(payload || {})
});
```

如果 GAS 回傳 `OK`，前端就知道送出成功。

## Code.gs 做了什麼？

GAS 收到資料後，會做這幾件事：

1. 讀取 POST body
2. 用 `JSON.parse` 把字串轉成資料
3. 用試算表 ID 打開指定試算表
4. 找到 `logSheet`
5. 把資料寫成一列
6. 回傳 `OK`

核心程式是：

```js
sheet.appendRow([timeStamp, userName, userEmail, log]);
```

意思是新增一列資料，四個欄位分別是：

```text
時間 | 姓名 | email | log
```

## 試算表中的 log 要怎麼看？

在 `logSheet` 中，每一列的 `log` 欄位會是一段 JSON 字串。

你可以先把它想成「一包事件」。

例如一列可能包含 5 個事件：

```json
[
  {
    "eventType": "user_profile_confirmed"
  },
  {
    "eventType": "button_click:add_glucose"
  },
  {
    "eventType": "button_click:add_glucose"
  },
  {
    "eventType": "button_click:release_insulin"
  },
  {
    "eventType": "chat_opened"
  }
]
```

如果你只是要快速看學生做了什麼，可以先看每個事件的 `eventType`。

如果你要看更細，可以再看每個事件裡的 `detail` 和 `simulation`。

## 送出失敗時會怎樣？

如果 `/api/save`、GAS 或網路失敗，前端會做這件事：

```js
logQueue = batch.concat(logQueue);
saveLogQueue();
```

白話說，就是把剛才送失敗的 log 放回隊伍前面，避免資料遺失。

所以就算某次送出失敗，log 也不會馬上消失。

## 如何判斷 log 是否成功？

成功的條件是：

1. `/api/save` 成功呼叫 GAS
2. GAS 成功寫入試算表
3. GAS 回傳文字 `OK`

前端會檢查：

```js
if (!response.ok || responseText.trim() !== "OK") {
  throw new Error(responseText || `GAS responded with ${response.status}`);
}
```

如果不是 `OK`，就當作失敗，log 會保留在暫存佇列。

## 初學者常見問題

### 為什麼我直接打開 index.html，log 沒有進試算表？

因為 log 需要呼叫 `/api/save`。

`/api/save` 是 Vercel Serverless Function。直接雙擊 `index.html` 時，瀏覽器沒有 Vercel server，所以 `/api/save` 不存在。

請用：

```bash
npx vercel dev
```

或部署到 Vercel 後再測。

### 為什麼出現 Missing GAS_URL？

代表 Vercel 沒有設定環境變數：

```env
GAS_URL=你的 Apps Script Web App URL
```

注意：這裡要填 Apps Script 部署後的 `/exec` URL，不是 Google 試算表網址。

### 為什麼出現 Sheet "logSheet" not found？

代表試算表裡沒有叫 `logSheet` 的工作表分頁。

請在 Google 試算表底部新增或重新命名一個分頁：

```text
logSheet
```

大小寫也要一樣。

### 為什麼 log 欄位看起來很長？

因為每一列不是只記錄一個事件，而是一批事件。

目前是每 5 個事件送一次，所以 `log` 欄位可能會包含 5 個事件的 JSON。

## 可以怎麼改進？

未來可以考慮：

- 每一個事件寫成試算表的一列
- 在試算表中拆出 `eventType` 欄位
- 加上班級、座號或課程代碼
- 在 Vercel `/api/save` 加上簡單驗證，避免不相關的人亂送資料
- 做一個老師看的 dashboard

## 小結

本專案的 log 設計重點是：

- 每個使用者都有姓名與 email
- 每個事件都有操作類型與模擬器狀態
- 前端會先暫存，避免資料遺失
- 每 5 個事件送出一次
- Vercel 負責轉送
- GAS 負責寫入 Google 試算表

如果你剛開始學，先記住一句話就好：

```text
log 就是把學生在網頁上的重要操作，整理成資料，最後存進試算表。
```
