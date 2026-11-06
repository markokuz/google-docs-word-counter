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

  enableWordCount().catch((err) => console.error(TAG, "Error:", err));
})();