const AutoIQ = require("../../core/AutoIQ");
const { artifactPath } = require("../../config/ArtifactConfig");
const DesktopAdapter = require("../../executor/DesktopAdapter");

class DesktopAppSmokeTest {
  constructor() {
    this.desktop = null;
    this.autoIQ = null;
  }

  async setUp() {
    this.desktop = new DesktopAdapter();
    await this.desktop.initialize();
    this.autoIQ = new AutoIQ(this.desktop);
  }

  async desktopAppSmokeTest() {
    await this.autoIQ.click("1");
    await this.autoIQ.click("+");
    await this.autoIQ.click("1");
    await this.autoIQ.click("=");

    const isTwo = await this.autoIQ.isVisible("result=2");
    if (!isTwo) {
      const actual = await this.desktop.getDisplayValue();
      throw new Error(`Calculator validation failed. Expected 2 but found ${actual}`);
    }

    await this.desktop.takeScreenshot(artifactPath("AutoIQ_DesktopCalculatorTest.png"));
    console.log(`DESKTOP CONFIDENCE SCORE = ${this.autoIQ.confidenceScore().toFixed(2)}`);
  }

  async tearDown() {
    if (this.desktop) {
      await this.desktop.close();
      this.desktop = null;
    }
  }
}

module.exports = DesktopAppSmokeTest;
