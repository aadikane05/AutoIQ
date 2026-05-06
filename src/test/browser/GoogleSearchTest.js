const BaseTest = require("../../base/BaseTest");
const { artifactPath } = require("../../config/ArtifactConfig");

class GoogleSearchTest extends BaseTest {
  async googleSearchTest() {
    await this.autoIQ.type("textarea[name='q']", "AutoIQ automation framework");
    await this.web.scrollDown();
    await this.web.scrollDown();
    await this.web.scrollUp();
    await this.web.takeScreenshot(artifactPath("AutoIQ_GoogleSearchTest.png"));

    console.log(`CONFIDENCE SCORE = ${this.autoIQ.confidenceScore().toFixed(2)}`);
  }
}

module.exports = GoogleSearchTest;
