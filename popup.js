let popupTimerInterval = null;

async function getEnabledState() {
  const { enabled = true } = await browser.storage.local.get("enabled");
  return enabled;
}

function renderToggleButton(enabled) {
  const toggleButton = document.getElementById("toggle");
  toggleButton.textContent = `Фокус-контроль: ${enabled ? "ON" : "OFF"}`;
  toggleButton.style.backgroundColor = enabled ? "#2e7d32" : "#c62828";
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function renderFullFocusButton(fullFocusEnabled) {
  const button = document.getElementById("fullFocusToggle");
  button.textContent = fullFocusEnabled ? "Полный фокус: ON" : "Полный фокус: OFF";
  button.style.backgroundColor = fullFocusEnabled ? "#1565c0" : "#6d4c41";
}

async function renderFullFocusState() {
  const {
    fullFocusEnabled = false,
    fullFocusEndAt = 0,
    fullFocusDurationMinutes = 25
  } = await browser.storage.local.get([
    "fullFocusEnabled",
    "fullFocusEndAt",
    "fullFocusDurationMinutes"
  ]);

  const minutesInput = document.getElementById("fullFocusMinutes");
  const status = document.getElementById("fullFocusStatus");

  minutesInput.value = Math.max(1, Number(fullFocusDurationMinutes) || 25);
  renderFullFocusButton(fullFocusEnabled);

  if (fullFocusEnabled) {
    const remaining = fullFocusEndAt - Date.now();
    status.textContent = `До конца сессии: ${formatRemaining(remaining)}`;
  } else {
    status.textContent = "Сессия не запущена";
  }
}

async function load() {
  const [{ distractedTime = 0 }, enabled] = await Promise.all([
    browser.storage.local.get("distractedTime"),
    getEnabledState()
  ]);

  const minutes = Math.floor(distractedTime / 60000);
  document.getElementById("time").textContent = "Вне фокуса: " + minutes + " мин";
  renderToggleButton(enabled);
  await renderFullFocusState();
}

async function toggleEnabled() {
  const current = await getEnabledState();
  const next = !current;

  await browser.storage.local.set({ enabled: next });
  renderToggleButton(next);
}

async function toggleFullFocus() {
  const {
    fullFocusEnabled = false
  } = await browser.storage.local.get("fullFocusEnabled");

  if (fullFocusEnabled) {
    await browser.storage.local.set({
      fullFocusEnabled: false,
      fullFocusEndAt: 0
    });
    await renderFullFocusState();
    return;
  }

  const raw = Number(document.getElementById("fullFocusMinutes").value);
  const fullFocusDurationMinutes = Math.max(1, Math.floor(raw || 25));
  const fullFocusEndAt = Date.now() + fullFocusDurationMinutes * 60 * 1000;

  await browser.storage.local.set({
    enabled: true,
    fullFocusEnabled: true,
    fullFocusDurationMinutes,
    fullFocusEndAt
  });

  renderToggleButton(true);
  await renderFullFocusState();
}

function startPopupTimer() {
  if (popupTimerInterval) return;
  popupTimerInterval = setInterval(() => {
    renderFullFocusState();
  }, 1000);
}

document.getElementById("toggle").addEventListener("click", toggleEnabled);
document.getElementById("fullFocusToggle").addEventListener("click", toggleFullFocus);
load();
startPopupTimer();
