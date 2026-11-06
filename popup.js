const PIXEL_FONT = {
  E: ["###", "#..", "##.", "#..", "###"],
  F: ["###", "#..", "##.", "#..", "#.."],
  L: ["#..", "#..", "#..", "#..", "###"],
  N: ["#..#", "##.#", "#.##", "#..#", "#..#"],
  O: ["###", "#.#", "#.#", "#.#", "###"],
  R: ["##.", "#.#", "##.", "#.#", "#.#"],
  S: ["###", "#..", "###", "..#", "###"],
  W: ["#...#", "#...#", "#.#.#", "#.#.#", ".#.#."],
};

function pixelText(text) {
  const glyphs = [...text].map((c) => PIXEL_FONT[c]);
  return pixelCanvas(PIXEL_FONT.F.map((_, y) => glyphs.map((g) => g[y]).join(".")), { "#": "#1f3d1f" }, 2);
}

const flowerSwitch = document.getElementById("flower-switch");
const state = document.getElementById("state");
const garden = document.getElementById("garden");
document.getElementById("label").append(pixelText("FLOWERS"));
garden.append(pixelCanvas(GARDEN, GARDEN_COLORS, GARDEN_SCALE));

let flowersOn = true;
const show = () => {
  flowerSwitch.setAttribute("aria-checked", String(flowersOn));
  state.style.background = flowersOn ? "#6cc24a" : "#c9c9c9";
  state.replaceChildren(pixelText(flowersOn ? "ON" : "OFF"));
  garden.style.visibility = flowersOn ? "visible" : "hidden";
};
show();

chrome.storage.local.get("flowersOn").then((saved) => {
  flowersOn = saved.flowersOn !== false;
  show();
});

flowerSwitch.addEventListener("click", () => {
  flowersOn = !flowersOn;
  chrome.storage.local.set({ flowersOn });
  show();
});
