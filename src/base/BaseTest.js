const AutoIQ = require("../core/AutoIQ");
const WebAdapter = require("../executor/WebAdapter");

class BaseTest {
  constructor() {
    this.web = null;
    this.autoIQ = null;
  }

  async setUp() {
    this.web = new WebAdapter();
    await this.web.initialize();
    this.autoIQ = new AutoIQ(this.web);
  }

  async tearDown() {
    if (this.web) {
      await this.web.close();
      this.web = null;
    }
  }
}

module.exports = BaseTest;
