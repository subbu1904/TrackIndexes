export class ProviderUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}

export class ProviderResponseError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ProviderResponseError";
    this.status = status;
  }
}