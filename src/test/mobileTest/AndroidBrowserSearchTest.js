const AutoIQ = require("../../core/AutoIQ");
const AndroidAdapter = require("../../executor/AndroidAdapter");

class AndroidBrowserSearchTest {
  constructor() {
    this.autoIQ = null;
  }

  async setUp() {
    // Automating Chrome on Android Emulator
    this.autoIQ = new AutoIQ(new AndroidAdapter({
      deviceName: "emulator-5554",
      browserName: "Chrome"
    }));
    await this.autoIQ.executor.initialize();
  }

  async androidBrowserSearchTest() {
    // Open Google
    await this.autoIQ.executor.navigate("https://www.google.com");

    // Search for YouTube
    await this.autoIQ.smartType("name=q", "youtube\n");

    // Verify results
    const isYoutubeVisible = await this.autoIQ.isVisible("text=YouTube");
    if (!isYoutubeVisible) {
      throw new Error("YouTube link was not found in the search results on the Android emulator.");
    }

    console.log(`ANDROID BROWSER SEARCH CONFIDENCE SCORE = ${this.autoIQ.confidenceScore().toFixed(2)}`);
  }

  async tearDown() {
    if (this.autoIQ && this.autoIQ.executor) {
      await this.autoIQ.executor.close();
    }
  }
}

module.exports = AndroidBrowserSearchTest;