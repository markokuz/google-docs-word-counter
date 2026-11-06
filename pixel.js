// Shared by garden.js (on the doc) and popup.js (toolbar menu).
const GARDEN_COLORS = {
  g: "#3f8f3a", G: "#6cc24a", s: "#2f7d32", y: "#ffd23f",
  k: "#ff7eb6", r: "#e5484d", p: "#a463f2", o: "#ff9f1c", b: "#4c8bf5",
};
const GARDEN = [
  "...............k..............",
  "......r.......kyk.............",
  ".....ryr.......k..............",
  "......r........s.......p......",
  "......s........s......pyp.....",
  "......s....o...s.......p......",
  "......s...oyo..s.......s......",
  "......s....o...s.......s...b..",
  "..g...s....s...s...g...s..byb.",
  ".gG...s..g.s..gs..gG...s...b.g",
  ".gG.g.sg.GgsgG.sg.Gg..sg...sGg",
  "gGGgGgsGgGgsGgGsgGGgGgsGgGgsGg",
  "GgGGgGGgGGgGGgGGgGGgGGgGGgGGgG",
];
const GARDEN_SCALE = 3;

function pixelCanvas(rows, colors, scale) {
  const canvas = document.createElement("canvas");
  canvas.width = rows[0].length;
  canvas.height = rows.length;
  const ctx = canvas.getContext("2d");
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    if (!colors[c]) return;
    ctx.fillStyle = colors[c];
    ctx.fillRect(x, y, 1, 1);
  }));
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = `display:block;image-rendering:pixelated;width:${canvas.width * scale}px;height:${canvas.height * scale}px`;
  return canvas;
}
