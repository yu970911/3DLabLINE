// Phase1 skeleton for LINE x GAS.

const SHEET_NAMES = {
  friends: "友だち一覧",
  workshops: "ワークショップ開催管理",
  participants: "参加者一覧",
  messages: "メッセージ管理",
  sendLog: "送信履歴",
};

const STATUS = {
  selectPurpose: "種別待ち",
  waitName: "名前待ち",
  waitWsCode: "WSコード待ち",
  normal: "通常",
};

const CATEGORY = {
  participant: "参加者",
  prospect: "見込み",
  staff: "スタッフ",
};

const MESSAGE_ID = {
  purpose: "MSG-001",
  askName: "MSG-002",
  joinInfo: "MSG-003",
  prospectDone: "MSG-004",
  wsNotFound: "MSG-005",
  reselect: "MSG-006",
};

const KEYWORDS = {
  joinToday: ["当日参加"],
  preRegister: ["事前登録"],
  infoOnly: ["情報のみ"],
  guide: ["案内"],
  coupon: ["クーポン"],
  survey: ["アンケート"],
  contact: ["問い合わせ"],
};

function doPost(e) {
  if (!e || !e.postData) {
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
  }
  const body = e.postData.contents || "";
  const signature = getHeaderValue(e, "X-Line-Signature");
  const skipSignature = true;
  if (!skipSignature && !validateSignature(body, signature)) {
    return ContentService.createTextOutput("NG").setMimeType(ContentService.MimeType.TEXT);
  }

  const payload = JSON.parse(body || "{}");
  const events = payload.events || [];
  events.forEach((event) => {
    try {
      handleEvent(event);
    } catch (err) {
      console.error("handleEvent error", err);
    }
  });

  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}

function handleEvent(event) {
  if (!event || !event.type) return;
  if (event.type === "follow") return handleFollow(event);
  if (event.type === "unfollow") return handleUnfollow(event);
  if (event.type === "message") return handleMessage(event);
  if (event.type === "postback") return handlePostback(event);
}

function handleFollow(event) {
  const userId = event.source.userId;
  const displayName = getProfileDisplayName(userId);
  upsertFriend({
    userId,
    displayName,
    status: STATUS.selectPurpose,
    category: "",
  });
  const message = buildMessageById(MESSAGE_ID.purpose, {});
  replyMessage(event.replyToken, [message], userId, "", MESSAGE_ID.purpose);
}

function handleUnfollow(event) {
  const userId = event.source.userId;
  updateFriend(userId, { lastActionAt: nowString() });
}

function handleMessage(event) {
  if (!event.message || event.message.type !== "text") return;
  const userId = event.source.userId;
  const text = normalizeText(event.message.text);

  let friend = getFriend(userId);
  if (!friend) {
    handleFollow(event);
    return;
  }

  if (friend.status === STATUS.selectPurpose) {
    return handlePurposeSelection(event, friend, text);
  }

  if (friend.status === STATUS.waitName) {
    return handleNameInput(event, friend, text);
  }

  if (friend.status === STATUS.waitWsCode) {
    return handleWsCodeInput(event, friend, text);
  }

  return handleNormalMessage(event, friend, text);
}

function handlePostback(event) {
  const userId = event.source.userId;
  const data = event.postback ? event.postback.data : "";
  if (!data) return;
  const friend = getFriend(userId);
  if (!friend) {
    upsertFriend({
      userId,
      displayName: getProfileDisplayName(userId),
      status: STATUS.normal,
      category: "",
    });
  }

  if (data === "action=join_today") {
    updateFriend(userId, { status: STATUS.waitName, category: CATEGORY.participant });
    const message = buildMessageById(MESSAGE_ID.askName, {});
    replyMessage(event.replyToken, [message], userId, "", MESSAGE_ID.askName);
    return;
  }

  if (data === "action=pre_register") {
    updateFriend(userId, { status: STATUS.waitName, category: CATEGORY.prospect });
    const message = buildMessageById(MESSAGE_ID.askName, {});
    replyMessage(event.replyToken, [message], userId, "", MESSAGE_ID.askName);
    return;
  }

  if (data === "action=info_only") {
    updateFriend(userId, { status: STATUS.normal, category: CATEGORY.prospect });
    const message = buildMessageById(MESSAGE_ID.prospectDone, {});
    replyMessage(event.replyToken, [message], userId, "", MESSAGE_ID.prospectDone);
    return;
  }

  if (data === "action=survey") {
    const url = getProp("SURVEY_URL");
    const message = buildTextMessage("アンケートはこちらです: " + url);
    replyMessage(event.replyToken, [message], userId, "", "");
    return;
  }

  if (data === "action=coupon") {
    const message = buildTextMessage("クーポン対象条件の確認が必要です。スタッフが確認します。");
    replyMessage(event.replyToken, [message], userId, "", "");
    return;
  }

  if (data === "action=contact") {
    const message = buildTextMessage("スタッフが確認します。少々お待ちください。");
    replyMessage(event.replyToken, [message], userId, "", "");
    return;
  }

  if (data === "action=guide") {
    const message = buildTextMessage("最新の案内は準備中です。必要であればお問い合わせください。");
    replyMessage(event.replyToken, [message], userId, "", "");
    return;
  }
}

function handlePurposeSelection(event, friend, text) {
  if (matches(text, KEYWORDS.joinToday)) {
    updateFriend(friend.userId, { status: STATUS.waitName, category: CATEGORY.participant });
    const message = buildMessageById(MESSAGE_ID.askName, {});
    replyMessage(event.replyToken, [message], friend.userId, "", MESSAGE_ID.askName);
    return;
  }
  if (matches(text, KEYWORDS.preRegister)) {
    updateFriend(friend.userId, { status: STATUS.waitName, category: CATEGORY.prospect });
    const message = buildMessageById(MESSAGE_ID.askName, {});
    replyMessage(event.replyToken, [message], friend.userId, "", MESSAGE_ID.askName);
    return;
  }
  if (matches(text, KEYWORDS.infoOnly)) {
    updateFriend(friend.userId, { status: STATUS.normal, category: CATEGORY.prospect });
    const message = buildMessageById(MESSAGE_ID.prospectDone, {});
    replyMessage(event.replyToken, [message], friend.userId, "", MESSAGE_ID.prospectDone);
    return;
  }

  const message = buildMessageById(MESSAGE_ID.reselect, {});
  replyMessage(event.replyToken, [message], friend.userId, "", MESSAGE_ID.reselect);
}

function handleNameInput(event, friend, text) {
  if (!text || text.length < 2) {
    const message = buildMessageById(MESSAGE_ID.askName, {});
    replyMessage(event.replyToken, [message], friend.userId, "", MESSAGE_ID.askName);
    return;
  }

  updateFriend(friend.userId, {
    fullName: text,
    status: STATUS.normal,
    lastActionAt: nowString(),
  });

  const updated = getFriend(friend.userId);
  if (updated && updated.category === CATEGORY.participant) {
    handleJoinToday(event, friend.userId, text);
    return;
  }

  const message = buildMessageById(MESSAGE_ID.prospectDone, { FULL_NAME: text });
  replyMessage(event.replyToken, [message], friend.userId, "", MESSAGE_ID.prospectDone);
}

function handleWsCodeInput(event, friend, text) {
  const ws = getWorkshopById(text);
  if (!ws) {
    const message = buildMessageById(MESSAGE_ID.wsNotFound, {});
    replyMessage(event.replyToken, [message], friend.userId, "", MESSAGE_ID.wsNotFound);
    return;
  }
  appendParticipant({
    workshopId: ws.id,
    userId: friend.userId,
    fullName: friend.fullName || "",
    category: "当日",
    joinedAt: nowString(),
  });
  updateFriend(friend.userId, {
    status: STATUS.normal,
    lastWorkshopId: ws.id,
    lastActionAt: nowString(),
  });
  const message = buildMessageById(MESSAGE_ID.joinInfo, {
    FULL_NAME: friend.fullName || "",
    JOIN_URL: ws.joinUrl,
  });
  replyMessage(event.replyToken, [message], friend.userId, ws.id, MESSAGE_ID.joinInfo);
}

function handleNormalMessage(event, friend, text) {
  if (matches(text, KEYWORDS.joinToday)) {
    updateFriend(friend.userId, { status: STATUS.waitName, category: CATEGORY.participant });
    const message = buildMessageById(MESSAGE_ID.askName, {});
    replyMessage(event.replyToken, [message], friend.userId, "", MESSAGE_ID.askName);
    return;
  }
  if (matches(text, KEYWORDS.guide)) {
    const message = buildTextMessage("最新の案内は準備中です。必要であればお問い合わせください。");
    replyMessage(event.replyToken, [message], friend.userId, "", "");
    return;
  }
  if (matches(text, KEYWORDS.coupon)) {
    const message = buildTextMessage("クーポン対象条件の確認が必要です。スタッフが確認します。");
    replyMessage(event.replyToken, [message], friend.userId, "", "");
    return;
  }
  if (matches(text, KEYWORDS.survey)) {
    const url = getProp("SURVEY_URL");
    const message = buildTextMessage("アンケートはこちらです: " + url);
    replyMessage(event.replyToken, [message], friend.userId, "", "");
    return;
  }
  if (matches(text, KEYWORDS.contact)) {
    const message = buildTextMessage("スタッフが確認します。少々お待ちください。");
    replyMessage(event.replyToken, [message], friend.userId, "", "");
    return;
  }
}

function handleJoinToday(event, userId, fullName) {
  const ws = getNearestActiveWorkshop();
  if (!ws) {
    const message = buildMessageById(MESSAGE_ID.wsNotFound, {});
    replyMessage(event.replyToken, [message], userId, "", MESSAGE_ID.wsNotFound);
    return;
  }

  if (!existsParticipant(userId, ws.id)) {
    appendParticipant({
      workshopId: ws.id,
      userId,
      fullName,
      category: "当日",
      joinedAt: nowString(),
    });
  }

  updateFriend(userId, {
    lastWorkshopId: ws.id,
    lastActionAt: nowString(),
  });

  const message = buildMessageById(MESSAGE_ID.joinInfo, {
    FULL_NAME: fullName,
    JOIN_URL: ws.joinUrl,
  });
  replyMessage(event.replyToken, [message], userId, ws.id, MESSAGE_ID.joinInfo);
}

function buildMessageById(messageId, vars) {
  const template = getMessageTemplate(messageId);
  if (!template) return buildTextMessage("メッセージが見つかりません。");
  const text = applyVars(template.body, vars || {});
  const quickReply = buildQuickReply(template.quickReply);
  return buildTextMessage(text, quickReply);
}

function buildTextMessage(text, quickReply) {
  const message = { type: "text", text };
  if (quickReply && quickReply.items && quickReply.items.length > 0) {
    message.quickReply = quickReply;
  }
  return message;
}

function applyVars(text, vars) {
  let result = text || "";
  Object.keys(vars || {}).forEach((key) => {
    const token = "{" + key + "}";
    result = result.split(token).join(vars[key]);
  });
  return result;
}

function replyMessage(replyToken, messages, userId, workshopId, messageId) {
  const payload = { replyToken, messages };
  const res = callLineApi("https://api.line.me/v2/bot/message/reply", payload);
  logSendHistory({
    sentAt: nowString(),
    kind: "返信",
    userId,
    category: getFriendCategory(userId),
    workshopId,
    messageId,
    body: joinMessageText(messages),
    result: res.ok ? "成功" : "失敗",
    response: res.body,
    owner: "自動",
  });
}

function pushMessage(userId, messages, workshopId, messageId) {
  const payload = { to: userId, messages };
  const res = callLineApi("https://api.line.me/v2/bot/message/push", payload);
  logSendHistory({
    sentAt: nowString(),
    kind: "プッシュ",
    userId,
    category: getFriendCategory(userId),
    workshopId,
    messageId,
    body: joinMessageText(messages),
    result: res.ok ? "成功" : "失敗",
    response: res.body,
    owner: "自動",
  });
}

function callLineApi(url, payload) {
  const token = getProp("LINE_CHANNEL_ACCESS_TOKEN");
  const options = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  const body = response.getContentText();
  return { ok: code >= 200 && code < 300, body };
}

function validateSignature(body, signature) {
  if (!signature) return false;
  const secret = getProp("LINE_CHANNEL_SECRET");
  const hash = Utilities.computeHmacSha256Signature(body, secret);
  const encoded = Utilities.base64Encode(hash);
  return encoded === signature;
}

function getHeaderValue(e, name) {
  if (e && e.headers && e.headers[name]) return e.headers[name];
  const lowerName = String(name || "").toLowerCase();
  if (e && e.headers && e.headers[lowerName]) return e.headers[lowerName];
  if (e && e.parameter && e.parameter[name]) return e.parameter[name];
  return "";
}

function getProfileDisplayName(userId) {
  const url = "https://api.line.me/v2/bot/profile/" + userId;
  const token = getProp("LINE_CHANNEL_ACCESS_TOKEN");
  const options = {
    method: "get",
    headers: { Authorization: "Bearer " + token },
    muteHttpExceptions: true,
  };
  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  const body = response.getContentText();
  if (code < 200 || code >= 300) {
    console.warn("profile fetch failed", code, body);
    return "";
  }
  try {
    const obj = JSON.parse(body);
    return obj.displayName || "";
  } catch (err) {
    return "";
  }
}

function getFriend(userId) {
  const sheet = getSheet(SHEET_NAMES.friends);
  if (!sheet) return null;
  const row = findRowByValue(sheet, 1, userId);
  if (!row) return null;
  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  return {
    userId: values[0],
    displayName: values[1],
    fullName: values[2],
    category: values[3],
    status: values[4],
    lastWorkshopId: values[5],
    lastActionAt: values[6],
  };
}

function getFriendCategory(userId) {
  const friend = getFriend(userId);
  return friend ? friend.category : "";
}

function upsertFriend(data) {
  const sheet = getSheet(SHEET_NAMES.friends);
  if (!sheet) return;
  const row = findRowByValue(sheet, 1, data.userId);
  if (!row) {
    sheet.appendRow([
      normalizeText(data.userId) || "",
      data.displayName || "",
      data.fullName || "",
      data.category || "",
      data.status || "",
      data.lastWorkshopId || "",
      data.lastActionAt || nowString(),
      "",
      "",
      "",
      "",
    ]);
    return;
  }
  updateFriend(data.userId, data);
}

function updateFriend(userId, updates) {
  const sheet = getSheet(SHEET_NAMES.friends);
  if (!sheet) return;
  const row = findRowByValue(sheet, 1, userId);
  if (!row) return;
  const current = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const next = current.slice();

  if (updates.displayName !== undefined) next[1] = updates.displayName;
  if (updates.fullName !== undefined) next[2] = updates.fullName;
  if (updates.category !== undefined) next[3] = updates.category;
  if (updates.status !== undefined) next[4] = updates.status;
  if (updates.lastWorkshopId !== undefined) next[5] = updates.lastWorkshopId;
  if (updates.lastActionAt !== undefined) next[6] = updates.lastActionAt;

  sheet.getRange(row, 1, 1, next.length).setValues([next]);
}

function appendParticipant(record) {
  const sheet = getSheet(SHEET_NAMES.participants);
  if (!sheet) return;
  sheet.appendRow([
    record.workshopId || "",
    normalizeText(record.userId) || "",
    record.fullName || "",
    record.category || "",
    record.joinedAt || "",
    "",
    "",
    false,
    "",
  ]);
}

function existsParticipant(userId, workshopId) {
  const sheet = getSheet(SHEET_NAMES.participants);
  if (!sheet) return false;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;
  const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const normalizedUserId = normalizeText(userId);
  const normalizedWorkshopId = normalizeText(workshopId);
  return data.some(
    (row) => normalizeText(row[0]) === normalizedWorkshopId && normalizeText(row[1]) === normalizedUserId
  );
}

function getNearestActiveWorkshop() {
  const sheet = getSheet(SHEET_NAMES.workshops);
  if (!sheet) return null;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;
  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const now = new Date();
  const candidates = rows
    .map((row) => {
      const active = row[11] === true || row[11] === "TRUE";
      if (!active) return null;
      const date = row[2];
      const time = row[3];
      const joinUrl = row[5];
      const start = combineDateTime(date, time);
      if (!start || start < now) return null;
      return { id: row[0], joinUrl, start };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
  return candidates[0] || null;
}

function getWorkshopById(workshopId) {
  const sheet = getSheet(SHEET_NAMES.workshops);
  if (!sheet) return null;
  const row = findRowByValue(sheet, 1, workshopId);
  if (!row) return null;
  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const active = values[11] === true || values[11] === "TRUE";
  if (!active) return null;
  return { id: values[0], joinUrl: values[5] };
}

function getMessageTemplate(messageId) {
  const sheet = getSheet(SHEET_NAMES.messages);
  if (!sheet) return null;
  const row = findRowByValue(sheet, 1, messageId);
  if (!row) return null;
  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  return {
    id: values[0],
    title: values[2],
    body: values[3],
    quickReply: values[4],
  };
}

function logSendHistory(record) {
  const sheet = getSheet(SHEET_NAMES.sendLog);
  if (!sheet) return;
  sheet.appendRow([
    record.sentAt || nowString(),
    record.kind || "",
    record.userId || "",
    record.category || "",
    record.workshopId || "",
    record.messageId || "",
    record.body || "",
    record.result || "",
    record.response || "",
    record.owner || "",
  ]);
}

function getSheet(name) {
  const ss = SpreadsheetApp.openById(getProp("SPREADSHEET_ID"));
  const sheet = ss.getSheetByName(name);
  if (!sheet) {
    console.error("sheet not found", name);
  }
  return sheet;
}

function findRowByValue(sheet, colIndex, value) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  const normalizedValue = normalizeText(value);
  const range = sheet.getRange(2, colIndex, lastRow - 1, 1);
  const finder = range.createTextFinder(normalizedValue).matchEntireCell(true);
  const found = finder.findNext();
  return found ? found.getRow() : 0;
}

function joinMessageText(messages) {
  return (messages || [])
    .map((m) => (m && m.text ? m.text : ""))
    .filter(Boolean)
    .join("\n");
}

function combineDateTime(dateValue, timeValue) {
  if (!dateValue) return null;
  if (dateValue instanceof Date && timeValue instanceof Date) {
    return new Date(
      dateValue.getFullYear(),
      dateValue.getMonth(),
      dateValue.getDate(),
      timeValue.getHours(),
      timeValue.getMinutes(),
      timeValue.getSeconds()
    );
  }
  if (dateValue instanceof Date) {
    if (typeof timeValue === "number") {
      const base = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
      const millis = Math.round(timeValue * 24 * 60 * 60 * 1000);
      return new Date(base.getTime() + millis);
    }
    return dateValue;
  }
  return new Date(dateValue);
}

function normalizeText(text) {
  return String(text || "").trim();
}

function matches(text, keywords) {
  return keywords.some((k) => text === k);
}

function buildQuickReply(raw) {
  const normalized = normalizeText(raw);
  if (!normalized) return null;
  const items = normalized
    .split("|")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const parts = chunk.split(":");
      const label = normalizeText(parts[0]);
      const sendText = normalizeText(parts[1] || parts[0]);
      if (!label || !sendText) return null;
      return {
        type: "action",
        action: { type: "message", label, text: sendText },
      };
    })
    .filter(Boolean);
  if (items.length === 0) return null;
  return { items };
}

function nowString() {
  return Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
}

function getProp(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function authorize() {
  SpreadsheetApp.openById(getProp("SPREADSHEET_ID")).getSheets();
  UrlFetchApp.fetch("https://example.com", { muteHttpExceptions: true });
}
