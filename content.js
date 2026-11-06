(function () {
  const TAG = "[WordCount Ext]";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function waitFor(predicate, timeout = 15000, interval = 300) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const result = predicate();
        if (result) return resolve(result);
        if (Date.now() - start > timeout) return reject(new Error("Timeout"));
        setTimeout(check, interval);
      };
      check();
    });
  }

  function simulateClick(el) {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
    el.dispatchEvent(new MouseEvent("mousedown", opts));
    el.dispatchEvent(new MouseEvent("mouseup", opts));
    el.dispatchEvent(new MouseEvent("click", opts));
  }

  function findByTextCI(selector, text) {
    const lower = text.toLowerCase();
    for (const el of document.querySelectorAll(selector)) {
      if (el.textContent.toLowerCase().includes(lower)) return el;
    }
    return null;
  }

  async function enableWordCount() {
    console.log(TAG, "Waiting for Google Docs to load...");
    await waitFor(() => document.querySelector("#docs-tools-menu"));
    await sleep(3000);

    // Step 1: Open the Tools menu
    const toolsMenu = document.querySelector("#docs-tools-menu");
    if (!toolsMenu) { console.log(TAG, "Tools menu not found"); return; }
    console.log(TAG, "Clicking Tools menu");
    simulateClick(toolsMenu);

    // Step 2: Wait for the dropdown to render, then find "Word count"
    console.log(TAG, "Waiting for Word count menu item...");
    let wordCountItem;
    try {
      wordCountItem = await waitFor(() => {
        return (
          findByTextCI('[role="menuitem"]', "word count") ||
          findByTextCI(".goog-menuitem", "word count") ||
          findByTextCI(".docs-menuitem", "word count") ||
          findByTextCI("[aria-label*='ord count']", "") ||
          findByTextCI("span", "word count")?.closest('[role="menuitem"]') ||
          findByTextCI("span", "word count")?.closest(".goog-menuitem")
        );
      }, 5000, 200);
    } catch {
      console.log(TAG, "Could not find Word count menu item. Dumping menu items:");
      document.querySelectorAll('[role="menuitem"]').forEach((el) =>
        console.log(TAG, " -", el.textContent.trim().substring(0, 50))
      );
      return;
    }

    console.log(TAG, "Clicking Word count item:", wordCountItem.textContent.trim());
    simulateClick(wordCountItem);

    // Step 3: Wait for the dialog checkbox to appear
    console.log(TAG, "Waiting for Word Count dialog...");
    let checkbox;
    try {
      checkbox = await waitFor(() => {
        return (
          document.querySelector('.documentMetricsDialogCheckboxRow input[type="checkbox"]') ||
          document.querySelector('input[type="checkbox"][jsname="YPqjbf"]') ||
          (() => {
            const label = findByTextCI("label", "display word count");
            if (label) {
              const forId = label.getAttribute("for");
              return forId ? document.getElementById(forId) : null;
            }
            return null;
          })()
        );
      }, 8000, 300);
    } catch {
      console.log(TAG, "Word Count dialog checkbox not found");
      return;
    }

    // Step 4: Check the box if unchecked
    if (!checkbox.checked) {
      console.log(TAG, "Checking 'Display word count while typing'");
      checkbox.click();
      await sleep(300);
    } else {
      console.log(TAG, "Checkbox already checked");
    }

    // Step 5: Click OK — find the filled button nearest to the checkbox
    await sleep(500);
    const dialog = checkbox.closest('[role="dialog"]')
      || checkbox.closest('.docs-dialog')
      || checkbox.closest('[class*="Modal"]')
      || checkbox.parentElement?.parentElement?.parentElement?.parentElement;

    const allFilled = (dialog || document).querySelectorAll('button[class*="WizButtonFilled"]');
    let okBtn = null;
    for (const btn of allFilled) {
      if (/ok/i.test(btn.textContent.trim())) { okBtn = btn; break; }
    }
    if (!okBtn && allFilled.length) okBtn = allFilled[allFilled.length - 1];

    if (okBtn) {
      console.log(TAG, "Clicking OK:", okBtn.textContent.trim());
      simulateClick(okBtn);
      await sleep(200);
      okBtn.click();
    } else {
      console.log(TAG, "OK button not found");
    }

    console.log(TAG, "Done!");
  }

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

  async function growGarden() {
    const badge = await waitFor(() => document.querySelector(".kix-documentmetrics-widget"), 60000);

    const canvas = document.createElement("canvas");
    canvas.width = GARDEN[0].length;
    canvas.height = GARDEN.length;
    const ctx = canvas.getContext("2d");
    GARDEN.forEach((row, y) => [...row].forEach((c, x) => {
      if (!GARDEN_COLORS[c]) return;
      ctx.fillStyle = GARDEN_COLORS[c];
      ctx.fillRect(x, y, 1, 1);
    }));
    canvas.className = "docs-ui-unprintable";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = `position:absolute;z-index:500;pointer-events:none;image-rendering:pixelated;width:${canvas.width * GARDEN_SCALE}px;height:${canvas.height * GARDEN_SCALE}px`;
    // A sibling, not a child: the badge clips its children with overflow:hidden.
    badge.after(canvas);

    let shown = false;
    const sync = () => {
      const visible = badge.offsetWidth > 0;
      if (visible === shown) return;
      shown = visible;
      canvas.style.display = visible ? "block" : "none";
      if (!visible) return;
      canvas.style.left = `${badge.offsetLeft + 12}px`;
      canvas.style.bottom = `${badge.parentElement.offsetHeight - badge.offsetTop}px`;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      canvas.animate(
        [{ clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0 0 0 0)" }],
        { duration: 1000, easing: `steps(${GARDEN.length})` }
      );
    };
    new MutationObserver(sync).observe(badge, { attributes: true, attributeFilter: ["style", "class"] });
    sync();
  }

  growGarden().catch(() => console.log(TAG, "Word count badge not found, skipping garden"));
  enableWordCount().catch((err) => console.error(TAG, "Error:", err));
})();