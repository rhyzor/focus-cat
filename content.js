let timerInterval = null;
let baseSeconds = 0;
let startedAt = 0;
let quotesCache = null;

browser.runtime.onMessage.addListener((msg) => {
  if (msg.action === "startTimer") {
    startTimer(msg.distractedTime || 0);
  }

  if (msg.action === "stopTimer") {
    stopTimer();
  }

  if (msg.action === "cat") {
    showCat();
  }

  if (msg.action === "startFocusSessionTimer") {
    startFocusSessionTimer(msg.remainingMs || 0);
  }

  if (msg.action === "stopFocusSessionTimer") {
    stopFocusSessionTimer();
  }

  if (msg.action === "catSessionDone") {
    showCat(msg.text, msg.subText);
  }
});

function startTimer(distractedTimeMs) {
  baseSeconds = Math.floor(Number(distractedTimeMs || 0) / 1000);
  startedAt = Date.now();
  createTimer();
  updateTimer();

  if (timerInterval) return;

  timerInterval = setInterval(() => {
    updateTimer();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  baseSeconds = 0;
  startedAt = 0;

  const el = document.getElementById("focus-timer");
  if (el) el.remove();

  const catOverlay = document.getElementById("focus-cat");
  if (catOverlay) catOverlay.remove();
}

function createTimer() {
  if (document.getElementById("focus-timer")) return;

  const div = document.createElement("div");
  div.id = "focus-timer";
  div.append("🐱 Вне фокуса: ");

  const time = document.createElement("span");
  time.id = "time";
  time.textContent = "00:00";
  div.appendChild(time);

  document.body.appendChild(div);
}

function updateTimer() {
  const el = document.getElementById("time");
  if (!el) return;

  const elapsedSeconds = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  const totalSeconds = baseSeconds + elapsedSeconds;

  let m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  let s = (totalSeconds % 60).toString().padStart(2, "0");

  el.textContent = `${m}:${s}`;
}

function showCat(titleText = "Ты отвлёкся 😼", subText = "Вернись на разрешённые сайты") {
  if (document.getElementById("focus-cat")) return;

  const div = document.createElement("div");
  div.id = "focus-cat";
  const catBox = document.createElement("div");
  catBox.className = "cat-box";

  const catImage = document.createElement("img");
  catImage.src = browser.runtime.getURL("icon.png");
  catImage.className = "cat-img";

  const catText = document.createElement("div");
  catText.textContent = titleText;

  const catSubText = document.createElement("div");
  catSubText.textContent = subText;
  catSubText.className = "cat-subtext";

  const quoteText = document.createElement("div");
  quoteText.className = "cat-quote";
  quoteText.textContent = "Сделай маленький шаг к фокусу прямо сейчас.";

  catBox.appendChild(catImage);
  catBox.appendChild(catText);
  catBox.appendChild(catSubText);
  catBox.appendChild(quoteText);
  div.appendChild(catBox);

  document.body.appendChild(div);
  fillRandomQuote(quoteText);
}

function startFocusSessionTimer(remainingMs) {
  let bar = document.getElementById("focus-session-timer");

  if (!bar) {
    bar = document.createElement("div");
    bar.id = "focus-session-timer";
    bar.style.position = "fixed";
    bar.style.top = "12px";
    bar.style.left = "12px";
    bar.style.zIndex = "2147483646";
    bar.style.background = "rgba(21, 101, 192, 0.95)";
    bar.style.color = "#fff";
    bar.style.padding = "8px 10px";
    bar.style.borderRadius = "8px";
    bar.style.fontFamily = "sans-serif";
    bar.style.fontSize = "13px";
    bar.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
    document.body.appendChild(bar);
  }

  const totalSeconds = Math.max(0, Math.ceil(Number(remainingMs || 0) / 1000));
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  bar.textContent = `🐱 Полный фокус: ${m}:${s}`;
}

function stopFocusSessionTimer() {
  const bar = document.getElementById("focus-session-timer");
  if (bar) bar.remove();
}

async function loadQuotes() {
  if (Array.isArray(quotesCache)) return quotesCache;

  try {
    const response = await fetch(browser.runtime.getURL("quotes.txt"));
    if (!response.ok) throw new Error("Quotes file not found");

    const text = await response.text();
    quotesCache = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    quotesCache = [];
  }

  return quotesCache;
}

async function fillRandomQuote(targetElement) {
  const quotes = await loadQuotes();
  const fallbackQuote = "Сделай маленький шаг к фокусу прямо сейчас.";

  if (!quotes.length) {
    targetElement.textContent = fallbackQuote;
    return;
  }

  const randomIndex = Math.floor(Math.random() * quotes.length);
  targetElement.textContent = quotes[randomIndex];
}
