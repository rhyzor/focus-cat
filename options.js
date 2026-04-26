const input = document.getElementById("input");
const list = document.getElementById("list");
const limitInput = document.getElementById("limitMinutes");
const saveLimitButton = document.getElementById("saveLimit");
const limitStatus = document.getElementById("limitStatus");

function normalizeDomain(inputValue) {
  if (!inputValue) return "";

  const trimmed = String(inputValue).trim().toLowerCase();
  if (!trimmed) return "";

  const withoutScheme = trimmed.replace(/^[a-z]+:\/\//i, "");
  const withoutPath = withoutScheme.split("/")[0];
  const withoutPort = withoutPath.split(":")[0];

  return withoutPort.replace(/^\*\./, "").replace(/^\./, "");
}

async function load() {
  let { domains = [], limitMinutes = 10 } = await browser.storage.local.get([
    "domains",
    "limitMinutes"
  ]);

  limitInput.value = Math.max(1, Number(limitMinutes) || 10);
  render(domains);
}

function render(domains) {
  list.innerHTML = "";
  domains.forEach((d, i) => {
    let li = document.createElement("li");
    li.textContent = d;

    let btn = document.createElement("button");
    btn.textContent = "X";
    btn.onclick = () => remove(i);

    li.appendChild(btn);
    list.appendChild(li);
  });
}

async function add() {
  let val = normalizeDomain(input.value);
  if (!val) return;

  let { domains = [] } = await browser.storage.local.get("domains");
  if (domains.includes(val)) {
    input.value = "";
    return;
  }

  domains.push(val);

  await browser.storage.local.set({ domains });
  input.value = "";
  render(domains);
}

async function remove(i) {
  let { domains = [] } = await browser.storage.local.get("domains");
  domains.splice(i, 1);

  await browser.storage.local.set({ domains });
  render(domains);
}

async function saveLimit() {
  const raw = Number(limitInput.value);
  const limitMinutes = Math.max(1, Math.floor(raw || 10));

  await browser.storage.local.set({ limitMinutes });
  limitInput.value = limitMinutes;
  limitStatus.textContent = `Лимит сохранён: ${limitMinutes} мин`;
}

document.getElementById("add").onclick = add;
saveLimitButton.onclick = saveLimit;
load();
