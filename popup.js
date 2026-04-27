async function getEnabledState() {
  const { enabled = true } = await browser.storage.local.get("enabled");
  return enabled;
}

function renderToggleButton(enabled) {
  const toggleButton = document.getElementById("toggle");
  toggleButton.textContent = `Focus: ${enabled ? "ON" : "OFF"}`;
  toggleButton.style.backgroundColor = enabled ? "#2e7d32" : "#c62828";
}

async function load() {
  const [{ distractedTime = 0 }, enabled] = await Promise.all([
    browser.storage.local.get("distractedTime"),
    getEnabledState()
  ]);

  const minutes = Math.floor(distractedTime / 60000);
  document.getElementById("time").textContent = "Вне фокуса: " + minutes + " мин";
  renderToggleButton(enabled);
}

async function toggleEnabled() {
  const current = await getEnabledState();
  const next = !current;

  await browser.storage.local.set({ enabled: next });
  renderToggleButton(next);
}

document.getElementById("toggle").addEventListener("click", toggleEnabled);
load();
