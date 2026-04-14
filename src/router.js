export function createRouter(root) {
  return {
    showScreen(element) {
      root.replaceChildren(element);
    }
  };
}
