import { createIndexCard } from "../components/indexCard.js";
import { createSettingsSheet } from "../components/settingsSheet.js";

const placeholderQuotes = [
  {
    symbol: "^NSEI",
    name: "NIFTY 50",
    price: null,
    change: "Waiting for live data",
    changePercent: null,
    state: "loading"
  },
  {
    symbol: "^BSESN",
    name: "SENSEX",
    price: null,
    change: "Waiting for live data",
    changePercent: null,
    state: "loading"
  }
];

export function createDashboardScreen({
  onRefresh,
  onToggleTheme,
  onBackup,
  onImport,
  onReset,
  onAbout
}) {
  const screen = document.createElement("main");
  screen.className = "app-shell";

  const header = document.createElement("header");
  header.className = "app-bar";
  header.innerHTML = `
    <div>
      <p class="eyebrow">Indian Market Snapshot</p>
      <h1>TrackIndexes</h1>
    </div>
    <div class="app-bar__actions">
      <button class="action-button" type="button" data-refresh>Refresh</button>
      <button class="icon-button" type="button" data-settings aria-label="Open settings">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
  `;

  const cardStack = document.createElement("section");
  cardStack.className = "card-stack";
  const cardsBySymbol = new Map();

  placeholderQuotes.forEach((quote) => {
    const card = createIndexCard(quote, {
      onRetry: onRefresh
    });
    card.__quote = quote;
    cardsBySymbol.set(quote.symbol, card);
    cardStack.append(card);
  });

  const footer = document.createElement("footer");
  footer.className = "status-bar";
  footer.textContent = "Loading live market data...";

  const settingsSheet = createSettingsSheet({
    onToggleTheme,
    onBackup,
    onImport,
    onReset,
    onAbout
  });

  header.querySelector("[data-refresh]")?.addEventListener("click", () => {
    void onRefresh?.();
  });

  header.querySelector("[data-settings]")?.addEventListener("click", () => {
    settingsSheet.open();
  });

  screen.append(header, cardStack, footer, settingsSheet.element);

  return {
    element: screen,
    setQuotes(quotes) {
      quotes.forEach((quote) => {
        const nextCard = createIndexCard({
          ...quote,
          state: "ready",
          highlight: true
        }, {
          onRetry: onRefresh
        });
        nextCard.__quote = {
          ...quote,
          state: "ready",
          highlight: true
        };
        const previousCard = cardsBySymbol.get(quote.symbol);
        previousCard?.replaceWith(nextCard);
        cardsBySymbol.set(quote.symbol, nextCard);
      });
    },
    setOffline(isOffline) {
      cardsBySymbol.forEach((card, symbol) => {
        const quote = {
          ...(card.__quote ?? placeholderQuotes.find((entry) => entry.symbol === symbol)),
          statusLabel: isOffline ? "Offline" : "~15 min delayed",
          state: card.__quote?.state === "error" ? "error" : card.__quote?.state ?? "ready"
        };
        const nextCard = createIndexCard(quote, {
          onRetry: onRefresh
        });
        nextCard.__quote = quote;
        card.replaceWith(nextCard);
        cardsBySymbol.set(symbol, nextCard);
      });
    },
    showError(message) {
      cardsBySymbol.forEach((card, symbol) => {
        const baseQuote = card.__quote ?? placeholderQuotes.find((entry) => entry.symbol === symbol);
        const nextCard = createIndexCard(
          {
            ...baseQuote,
            state: "error",
            errorMessage: message
          },
          { onRetry: onRefresh }
        );
        nextCard.__quote = {
          ...baseQuote,
          state: "error",
          errorMessage: message
        };
        card.replaceWith(nextCard);
        cardsBySymbol.set(symbol, nextCard);
      });
    },
    setWorkspace(workspace) {
      this.setQuotes(workspace.lastQuotes ?? []);
    },
    setRefreshEnabled(enabled) {
      const refreshButton = header.querySelector("[data-refresh]");
      if (refreshButton instanceof HTMLButtonElement) {
        refreshButton.disabled = !enabled;
      }
    },
    setRefreshVisible(visible) {
      const refreshButton = header.querySelector("[data-refresh]");
      if (refreshButton instanceof HTMLButtonElement) {
        refreshButton.hidden = !visible;
      }
    },
    setThemeLabel(theme) {
      settingsSheet.setThemeLabel(theme);
    },
    setStatus(message) {
      footer.textContent = message;
    }
  };
}
