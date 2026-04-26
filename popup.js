async function load() {
  let { distractedTime = 0 } = await browser.storage.local.get("distractedTime");

  let minutes = Math.floor(distractedTime / 60000);
  document.getElementById("time").textContent =
    "Вне фокуса: " + minutes + " мин";
}

load();