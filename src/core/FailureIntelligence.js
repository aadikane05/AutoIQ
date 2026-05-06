const FailureReport = require("./FailureReport");

class FailureIntelligence {
  analyze(error) {
    const message = String(error?.message || error).toLowerCase();

    if (message.includes("timeout")) {
      return new FailureReport("TIMEOUT", "Element not ready");
    }

    if (message.includes("no such element")) {
      return new FailureReport("LOCATOR", "UI changed");
    }

    if (message.includes("stale")) {
      return new FailureReport("STALE", "Element refreshed during action");
    }

    return new FailureReport("UNKNOWN", message);
  }
}

module.exports = FailureIntelligence;
