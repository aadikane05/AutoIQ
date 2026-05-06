const AutoIQ = require("../../core/AutoIQ");
const APIAdapter = require("../../executor/APIAdapter");

class ApiSmokeTest {
  constructor() {
    this.autoIQ = null;
  }

  async setUp() {
    this.autoIQ = new AutoIQ(new APIAdapter());
  }

  async apiSmokeTest() {
    const response = await this.autoIQ.apiRequest("GET", "https://www.google.com");

    if (response.statusCode < 200 || response.statusCode >= 400) {
      throw new Error(`Unexpected API status: ${response.statusCode}`);
    }

    console.log(`API CONFIDENCE SCORE = ${this.autoIQ.confidenceScore().toFixed(2)}`);
  }

  async tearDown() {}
}

module.exports = ApiSmokeTest;
