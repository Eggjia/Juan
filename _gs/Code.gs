var SPREADSHEET_ID = "1nS85A8nEZ3Lr-9-XnnYlq7Br0v-lIyaiZDx65f3W16k";
var LOG_SHEET_NAME = "logSheet";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Missing POST body");
    }

    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(LOG_SHEET_NAME);

    if (!sheet) {
      throw new Error('Sheet "' + LOG_SHEET_NAME + '" not found');
    }

    var timeStamp = new Date();
    var userName = data.userName || "";
    var userEmail = data.userEmail || "";
    var log = data.log;

    if (typeof log !== "string") {
      log = JSON.stringify(log == null ? "" : log);
    }

    sheet.appendRow([timeStamp, userName, userEmail, log]);

    return ContentService
      .createTextOutput("OK")
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    return ContentService
      .createTextOutput(error && error.stack ? error.stack : String(error))
      .setMimeType(ContentService.MimeType.TEXT);
  }
}
