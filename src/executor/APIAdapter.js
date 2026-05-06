const AutoIQExecutor = require("./AutoIQExecutor");
const AutoIQResponse = require("../model/AutoIQResponse");

class APIAdapter extends AutoIQExecutor {
  async smartClick() {}

  async smartType() {}

  async isVisible() {
    return true;
  }

  async apiRequest(method = "GET", url, body = "") {
    try {
      const requestMethod = String(method || "GET").trim().toUpperCase();
      const response = await fetch(url, {
        method: requestMethod,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body || undefined
      });

      return new AutoIQResponse(response.status, await response.text());
    } catch (error) {
      return new AutoIQResponse(500, String(error?.message || error));
    }
  }

  async takeScreenshot() {}
}

module.exports = APIAdapter;
