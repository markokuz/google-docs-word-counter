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
  const MENU_ICON = ["..k..", ".kyk.", "..k..", "g.s.g", "GgsgG"];
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
  const FLOWERS_KEY = "wordcount-flowers";
  const PIXEL_BOX = "background:#fff;border:2px solid #2f7d32;border-radius:0;box-shadow:2px 2px 0 #2f7d32;margin:0;padding:4px;cursor:pointer";

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

  function pixelText(text) {
    const glyphs = [...text].map((c) => PIXEL_FONT[c]);
    return pixelCanvas(PIXEL_FONT.F.map((_, y) => glyphs.map((g) => g[y]).join(".")), { "#": "#1f3d1f" }, 2);
  }

  async function growGarden() {
    const badge = await waitFor(() => document.querySelector(".kix-documentmetrics-widget"), 60000);

    const garden = pixelCanvas(GARDEN, GARDEN_COLORS, GARDEN_SCALE);
    garden.className = "docs-ui-unprintable";
    garden.style.cssText += ";display:none;position:absolute;z-index:500;pointer-events:none";

    let flowersOn = localStorage.getItem(FLOWERS_KEY) !== "off";

    const menu = document.createElement("div");
    menu.className = "docs-ui-unprintable";
    menu.style.cssText = "position:absolute;z-index:500;display:none";

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.title = "Flower menu";
    openButton.setAttribute("aria-label", "Flower menu");
    openButton.style.cssText = PIXEL_BOX;
    openButton.append(pixelCanvas(MENU_ICON, GARDEN_COLORS, 3));

    const flowerSwitch = document.createElement("button");
    flowerSwitch.type = "button";
    flowerSwitch.setAttribute("role", "switch");
    flowerSwitch.setAttribute("aria-label", "Flowers");
    flowerSwitch.style.cssText = `${PIXEL_BOX};position:absolute;left:0;bottom:calc(100% + 6px);display:none;align-items:center;gap:8px`;
    const switchState = document.createElement("span");
    switchState.style.cssText = "padding:2px 3px";
    flowerSwitch.append(pixelText("FLOWERS"), switchState);
    menu.append(flowerSwitch, openButton);

    const setOpen = (open) => {
      flowerSwitch.style.display = open ? "flex" : "none";
      openButton.setAttribute("aria-expanded", String(open));
    };
    const showSwitchState = () => {
      flowerSwitch.setAttribute("aria-checked", String(flowersOn));
      switchState.style.background = flowersOn ? "#6cc24a" : "#c9c9c9";
      switchState.replaceChildren(pixelText(flowersOn ? "ON" : "OFF"));
    };
    setOpen(false);
    showSwitchState();

    // A sibling, not a child: the badge clips its children with overflow:hidden.
    badge.after(garden, menu);

    let shown = false;
    const sync = () => {
      const badgeVisible = badge.offsetWidth > 0;
      menu.style.display = badgeVisible ? "block" : "none";
      if (badgeVisible) {
        const parentHeight = badge.parentElement.offsetHeight;
        garden.style.left = `${badge.offsetLeft + 12}px`;
        garden.style.bottom = `${parentHeight - badge.offsetTop}px`;
        menu.style.left = `${badge.offsetLeft + badge.offsetWidth + 6}px`;
        menu.style.bottom = `${parentHeight - badge.offsetTop - badge.offsetHeight}px`;
      } else {
        setOpen(false);
      }

      const visible = badgeVisible && flowersOn;
      if (visible === shown) return;
      shown = visible;
      garden.style.display = visible ? "block" : "none";
      if (!visible || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      garden.animate(
        [{ clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0 0 0 0)" }],
        { duration: 1000, easing: `steps(${GARDEN.length})` }
      );
    };

    // Keeps the caret in the document when the menu is clicked.
    menu.addEventListener("mousedown", (e) => e.preventDefault());
    menu.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      openButton.focus();
    });
    document.addEventListener("mousedown", (e) => {
      if (!menu.contains(e.target)) setOpen(false);
    }, true);
    openButton.addEventListener("click", () => setOpen(flowerSwitch.style.display === "none"));
    flowerSwitch.addEventListener("click", () => {
      flowersOn = !flowersOn;
      localStorage.setItem(FLOWERS_KEY, flowersOn ? "on" : "off");
      showSwitchState();
      sync();
    });

    new MutationObserver(sync).observe(badge, { attributes: true, attributeFilter: ["style", "class"] });
    sync();
  }

  growGarden().catch(() => console.log(TAG, "Word count badge not found, skipping garden"));
  enableWordCount().catch((err) => console.error(TAG, "Error:", err));
})();