export function createIndexQuote({
  symbol,
  name,
  price,
  change,
  changePercent,
  timestamp,
  isDelayed
}) {
  return {
    symbol,
    name,
    price,
    change,
    changePercent,
    timestamp,
    isDelayed
  };
}
