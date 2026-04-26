let allowedDomains = [];
let lastAllowedTime = Date.now();
let distractedTime = 0;
let limitMs = 10 * 60 * 1000; // 10 минут по умолчанию
let lastCheckAt = Date.now();

async function getEnabledState() {
  const { enabled = true } = await browser.storage.local.get("enabled");
  return enabled;
}

function normalizeDomain(input) {
  if (!input) return "";

  const trimmed = String(input).trim().toLowerCase();
  if (!trimmed) return "";

  const withoutScheme = trimmed.replace(/^[a-z]+:\/\//i, "");
  const withoutPath = withoutScheme.split("/")[0];
  const withoutPort = withoutPath.split(":")[0];

  return withoutPort.replace(/^\*\./, "").replace(/^\./, "");
}

// загрузка данных
async function load() {
  const data = await browser.storage.local.get([
    "domains",
    "lastAllowedTime",
    "distractedTime",
    "enabled",
    "limitMinutes"
  ]);

  allowedDomains = (data.domains || []).map(normalizeDomain).filter(Boolean);
  lastAllowedTime = data.lastAllowedTime || Date.now();
  distractedTime = data.distractedTime || 0;
  limitMs = Math.max(1, Number(data.limitMinutes) || 10) * 60 * 1000;

  if (typeof data.enabled === "undefined") {
    await browser.storage.local.set({ enabled: true });
  }

  if (typeof data.limitMinutes === "undefined") {
    await browser.storage.local.set({ limitMinutes: 10 });
  }
}

// проверка домена
function isAllowed(url) {
  try {
    const host = new URL(url).hostname;
    const normalizedHost = normalizeDomain(host);

    return allowedDomains.some((rawDomain) => {
      const domain = normalizeDomain(rawDomain);
      if (!domain) return false;

      return normalizedHost === domain || normalizedHost.endsWith(`.${domain}`);
    });
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

async function stopTimerOnAllTabs() {
  const tabs = await browser.tabs.query({});

  await Promise.all(
    tabs
      .filter((tab) => tab.id)
      .map((tab) => safeSend(tab.id, { action: "stopTimer" }))
  );
}

// блокировка вкладки
async function blockTab(tabId) {
  await browser.tabs.update(tabId, {
    url: browser.runtime.getURL("blocked.html")
  });
}

// основная проверка
async function check() {
  const now = Date.now();
  const deltaMs = Math.max(0, now - lastCheckAt);
  lastCheckAt = now;

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
    distractedTime += deltaMs;

    await browser.storage.local.set({
      distractedTime
    });

    await safeSend(tab.id, {
      action: "startTimer",
      distractedTime
    });

    if (now - lastAllowedTime > limitMs) {
      await safeSend(tab.id, { action: "cat" });
      await blockTab(tab.id);
    }
  }
}

// обновление доменов и состояния при изменении
browser.storage.onChanged.addListener((changes) => {
  if (changes.domains) {
    allowedDomains = (changes.domains.newValue || []).map(normalizeDomain).filter(Boolean);
  }

  if (changes.limitMinutes) {
    limitMs = Math.max(1, Number(changes.limitMinutes.newValue) || 10) * 60 * 1000;
  }

  if (changes.enabled) {
    // мгновенно применяем состояние без перезапуска
    if (changes.enabled.newValue === false) {
      stopTimerOnAllTabs();
      return;
    }

    check();
  }
});

// события вкладок
browser.tabs.onActivated.addListener(check);
browser.tabs.onUpdated.addListener(check);

// запуск
load();
setInterval(check, 5000);
