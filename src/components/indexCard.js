const numberFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function createIndexCard(quote, { onRetry } = {}) {
  const card = document.createElement("article");
  card.className = `index-card index-card--${quote.state ?? "idle"}`;
  card.setAttribute("aria-label", `${quote.name} quote`);

  if (quote.highlight) {
    card.classList.add("index-card--updated");
  }

  const movementClass =
    typeof quote.changePercent === "number"
      ? quote.changePercent >= 0
        ? "positive"
        : "negative"
      : "neutral";

  const hasLivePrice = typeof quote.price === "number";
  const formattedPrice = hasLivePrice ? numberFormatter.format(quote.price) : "Loading...";
  const formattedChange =
    typeof quote.change === "number"
      ? `${quote.change >= 0 ? "+" : ""}${numberFormatter.format(quote.change)}`
      : quote.change;
  const formattedPercent =
    typeof quote.changePercent === "number"
      ? `${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%`
      : "";
  const statusLabel = quote.statusLabel ?? "~15 min delayed";

  const header = document.createElement("div");
  header.className = "index-card__header";

  const heading = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = "index-card__eyebrow";
  eyebrow.textContent = quote.symbol;
  const title = document.createElement("h2");
  title.textContent = quote.name;
  heading.append(eyebrow, title);

  const badge = document.createElement("span");
  badge.className =
    statusLabel === "Offline" ? "badge badge--offline" : "badge";
  badge.textContent = statusLabel;

  header.append(heading, badge);

  const body = document.createElement("div");
  body.className = "index-card__body";

  if (quote.state === "loading") {
    const skeleton = document.createElement("div");
    skeleton.className = "index-card__skeleton";
    skeleton.innerHTML = `
      <span class="skeleton skeleton--price"></span>
      <span class="skeleton skeleton--meta"></span>
    `;
    body.append(skeleton);
  } else if (quote.state === "error") {
    const errorMessage = document.createElement("p");
    errorMessage.className = "index-card__error";
    errorMessage.textContent =
      quote.errorMessage ?? "Couldn't fetch data. Tap to retry.";
    body.append(errorMessage);

    if (typeof onRetry === "function") {
      const retryButton = document.createElement("button");
      retryButton.type = "button";
      retryButton.className = "action-button";
      retryButton.textContent = "Retry";
      retryButton.addEventListener("click", () => {
        void onRetry();
      });
      body.append(retryButton);
    }
  } else {
    const price = document.createElement("p");
    price.className = "index-card__price";
    price.textContent = formattedPrice;

    const change = document.createElement("p");
    change.className = `index-card__change index-card__change--${movementClass}`;
    change.textContent = formattedChange;

    const percent = document.createElement("span");
    percent.textContent = formattedPercent;
    change.append(document.createElement("br"), percent);

    body.append(price, change);
  }

  card.append(header, body);

  return card;
}
