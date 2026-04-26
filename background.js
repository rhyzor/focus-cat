let allowedDomains = [];
let lastAllowedTime = Date.now();
let distractedTime = 0;

const LIMIT = 10 * 60 * 1000; // 10 минут

async function getEnabledState() {
  const { enabled = true } = await browser.storage.local.get("enabled");
  return enabled;
}

// загрузка данных
async function load() {
  const data = await browser.storage.local.get([
    "domains",
    "lastAllowedTime",
    "distractedTime",
    "enabled"
  ]);

  allowedDomains = data.domains || [];
  lastAllowedTime = data.lastAllowedTime || Date.now();
  distractedTime = data.distractedTime || 0;

  if (typeof data.enabled === "undefined") {
    await browser.storage.local.set({ enabled: true });
  }
}

// проверка домена
function isAllowed(url) {
  try {
    const host = new URL(url).hostname;
    return allowedDomains.some((d) => host.includes(d));
  } catch {
    return false;
  }
}

// безопасная отправка сообщений
async function safeSend(tabId, msg) {
  try {
    await browser.tabs.sendMessage(tabId, msg);
  } catch (e) {
    // игнорируем (нет content script)
  }
}

// блокировка вкладки
async function blockTab(tabId) {
  await browser.tabs.update(tabId, {
    url: browser.runtime.getURL("blocked.html")
  });
}

// основная проверка
async function check() {
  const enabled = await getEnabledState();
  if (!enabled) return;

  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab || !tab.id) return;

  // не трогаем служебные страницы
  if (!tab.url || tab.url.startsWith("about:")) return;

  // не зацикливаемся на блокировке
  if (tab.url.includes("blocked.html")) return;

  if (isAllowed(tab.url)) {
    lastAllowedTime = Date.now();
    distractedTime = 0;

    await browser.storage.local.set({
      lastAllowedTime,
      distractedTime
    });

    await safeSend(tab.id, { action: "stopTimer" });
  } else {
    await safeSend(tab.id, { action: "startTimer" });

    const now = Date.now();
    distractedTime += 5000;

    await browser.storage.local.set({
      distractedTime
    });

    if (now - lastAllowedTime > LIMIT) {
      await safeSend(tab.id, { action: "cat" });
      await blockTab(tab.id);
    }
  }
}

// обновление доменов и состояния при изменении
browser.storage.onChanged.addListener((changes) => {
  if (changes.domains) {
    allowedDomains = changes.domains.newValue || [];
  }

  if (changes.enabled) {
    // мгновенно применяем состояние без перезапуска
    check();
  }
});

// события вкладок
browser.tabs.onActivated.addListener(check);
browser.tabs.onUpdated.addListener(check);

// запуск
load();
setInterval(check, 5000);
