const AutoIQ = require("../../core/AutoIQ");
const IOSAdapter = require("../../executor/IOSAdapter");

class IosBrowserSearchTest {
  constructor() {
    this.autoIQ = null;
  }

  async setUp() {
    // Automating Safari on iOS Simulator (Default browser)
    this.autoIQ = new AutoIQ(new IOSAdapter({
      deviceName: "iPhone 17",
      browserName: "Safari"
    }));
    await this.autoIQ.executor.initialize();
  }

  async iosBrowserSearchTest() {
    // Open Google using the smart navigate method
    await this.autoIQ.executor.navigate("https://www.google.com");

    // Search for YouTube (using mobile web locator 'name=q')
    await this.autoIQ.smartType("name=q", "youtube\n");

    // Verify results via AutoIQ's visibility check
    const isYoutubeVisible = await this.autoIQ.isVisible("text=YouTube");
    if (!isYoutubeVisible) {
      throw new Error("YouTube link was not found in the search results on the iOS simulator.");
    }

    console.log(`IOS BROWSER SEARCH CONFIDENCE SCORE = ${this.autoIQ.confidenceScore().toFixed(2)}`);
  }

  async tearDown() {
    if (this.autoIQ && this.autoIQ.executor) {
      await this.autoIQ.executor.close();
    }
  }
}

module.exports = IosBrowserSearchTest;