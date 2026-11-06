(async function () {
  const findBadge = () => document.querySelector(".kix-documentmetrics-widget");
  // The badge can take a while: content.js has to switch it on first.
  for (let tries = 0; !findBadge() && tries < 200; tries++) {
    await new Promise((r) => setTimeout(r, 300));
  }
  const badge = findBadge();
  if (!badge) return;

  const garden = pixelCanvas(GARDEN, GARDEN_COLORS, GARDEN_SCALE);
  garden.className = "docs-ui-unprintable";
  garden.style.cssText += ";display:none;position:absolute;z-index:500;pointer-events:none";
  // A sibling, not a child: the badge clips its children with overflow:hidden.
  badge.after(garden);

  let { flowersOn = true } = await chrome.storage.local.get("flowersOn");

  let shown = false;
  const sync = () => {
    const visible = badge.offsetWidth > 0 && flowersOn;
    if (visible === shown) return;
    shown = visible;
    garden.style.display = visible ? "block" : "none";
    if (!visible) return;
    garden.style.left = `${badge.offsetLeft + 12}px`;
    garden.style.bottom = `${badge.parentElement.offsetHeight - badge.offsetTop}px`;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    garden.animate(
      [{ clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0 0 0 0)" }],
      { duration: 1000, easing: `steps(${GARDEN.length})` }
    );
  };

  new MutationObserver(sync).observe(badge, { attributes: true, attributeFilter: ["style", "class"] });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.flowersOn) return;
    flowersOn = changes.flowersOn.newValue;
    sync();
  });
  sync();
})();
