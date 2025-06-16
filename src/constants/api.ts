const GELATO_API = "https://api.gelato.digital";
const GELATO_API_STAGING = "https://api.staging.gelato.digital";
const GELATO_API_WS = "wss://api.gelato.digital";
const GELATO_API_WS_STAGING = "wss://api.staging.gelato.digital";

export class ApiUrlProvider {
  private testnet = false;

  setTestnet(testnet?: boolean) {
    this.testnet = testnet ?? false;
  }

  url(t: "http" | "ws" = "http") {
    if (t === "http") {
      return this.testnet ? GELATO_API_STAGING : GELATO_API;
    }
    return this.testnet ? GELATO_API_WS_STAGING : GELATO_API_WS;
  }
}

export const api = new ApiUrlProvider();
