export function createSettingsSheet({
  onToggleTheme,
  onBackup,
  onImport,
  onReset,
  onAbout
}) {
  const wrapper = document.createElement("div");
  wrapper.className = "settings-sheet";
  wrapper.hidden = true;

  const backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.className = "settings-sheet__backdrop";
  backdrop.setAttribute("aria-label", "Close settings");

  const panel = document.createElement("section");
  panel.className = "settings-sheet__panel";
  panel.setAttribute("aria-label", "Settings");

  panel.innerHTML = `
    <div class="settings-sheet__header">
      <p class="eyebrow">Actions</p>
      <button class="icon-button" type="button" data-close aria-label="Close settings">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
    <div class="settings-sheet__actions">
      <button class="settings-action" type="button" data-theme></button>
      <button class="settings-action" type="button" data-backup>Download backup</button>
      <button class="settings-action" type="button" data-import>Import from file</button>
      <button class="settings-action" type="button" data-about>About</button>
      <button class="settings-action settings-action--danger" type="button" data-reset>Reset progress</button>
    </div>
  `;

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "application/json,.json";
  fileInput.hidden = true;

  function close() {
    wrapper.hidden = true;
  }

  function open() {
    wrapper.hidden = false;
  }

  backdrop.addEventListener("click", close);
  panel.querySelector("[data-close]")?.addEventListener("click", close);

  panel.querySelector("[data-theme]")?.addEventListener("click", () => {
    close();
    void onToggleTheme?.();
  });

  panel.querySelector("[data-backup]")?.addEventListener("click", () => {
    close();
    void onBackup?.();
  });

  panel.querySelector("[data-import]")?.addEventListener("click", () => {
    close();
    fileInput.click();
  });

  panel.querySelector("[data-about]")?.addEventListener("click", () => {
    close();
    void onAbout?.();
  });

  panel.querySelector("[data-reset]")?.addEventListener("click", () => {
    close();
    void onReset?.();
  });

  fileInput.addEventListener("change", () => {
    const [file] = fileInput.files ?? [];
    if (file) {
      void onImport?.(file);
    }
    fileInput.value = "";
  });

  wrapper.append(backdrop, panel, fileInput);

  return {
    element: wrapper,
    open,
    close,
    setThemeLabel(theme) {
      const themeButton = panel.querySelector("[data-theme]");
      if (themeButton instanceof HTMLButtonElement) {
        themeButton.textContent =
          theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
      }
    }
  };
}
