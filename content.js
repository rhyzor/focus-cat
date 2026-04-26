let timerInterval = null;
let baseSeconds = 0;
let startedAt = 0;

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
}

function createTimer() {
  if (document.getElementById("focus-timer")) return;

  const div = document.createElement("div");
  div.id = "focus-timer";

  div.innerHTML = `
    🐱 Вне фокуса: <span id="time">00:00</span>
  `;

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

function showCat() {
  if (document.getElementById("focus-cat")) return;

  const div = document.createElement("div");
  div.id = "focus-cat";

  div.innerHTML = `
    <div class="cat-box">
      <img src="${browser.runtime.getURL("icon.png")}" class="cat-img">
      <div>Ты отвлёкся 😼</div>
    </div>
  `;

  document.body.appendChild(div);
}
