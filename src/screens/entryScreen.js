const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function createEntryScreen({
  metadata,
  onResume,
  onStartFresh,
  onImport
}) {
  const screen = document.createElement("main");
  screen.className = "entry-screen";

  const lastSaved =
    metadata?.lastSaved != null
      ? dateFormatter.format(new Date(metadata.lastSaved))
      : "recently";

  screen.innerHTML = `
    <section class="entry-card">
      <p class="eyebrow">Welcome Back</p>
      <h1>We found saved progress on this device.</h1>
      <p class="entry-copy">Last saved on ${lastSaved}.</p>
      <div class="entry-actions">
        <button class="action-button action-button--strong" type="button" data-resume>
          Resume
        </button>
        <button class="action-button" type="button" data-import>
          Import from file
        </button>
        <button class="action-button action-button--danger" type="button" data-reset>
          Start afresh
        </button>
      </div>
      <p class="entry-note">TrackIndexes keeps your workspace on this device unless you reset it.</p>
    </section>
  `;

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "application/json,.json";
  fileInput.hidden = true;

  screen.append(fileInput);

  screen.querySelector("[data-resume]")?.addEventListener("click", () => {
    void onResume?.();
  });

  screen.querySelector("[data-reset]")?.addEventListener("click", () => {
    void onStartFresh?.();
  });

  screen.querySelector("[data-import]")?.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const [file] = fileInput.files ?? [];
    if (file) {
      void onImport?.(file);
    }
    fileInput.value = "";
  });

  return screen;
}
