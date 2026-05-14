const AutoIQ = require("../../core/AutoIQ");
const IOSAdapter = require("../../executor/IOSAdapter");

class IosAppSmokeTest {
  constructor() {
    this.autoIQ = null;
  }

  async setUp() {
    // Example configuration for the iOS Settings app
    this.autoIQ = new AutoIQ(new IOSAdapter({
      bundleId: "com.apple.Preferences",
      deviceName: "iPhone 17"
    }));
    await this.autoIQ.executor.initialize();
  }

  async iosAppSmokeTest() {
    // Validate the app is loaded by checking for the 'General' cell
    const isGeneralVisible = await this.autoIQ.isVisible("text=General");
    
    if (!isGeneralVisible) {
      throw new Error("iOS Settings app failed to load: 'General' section not found.");
    }

    console.log(`IOS MOBILE CONFIDENCE SCORE = ${this.autoIQ.confidenceScore().toFixed(2)}`);
  }

  async tearDown() {
    if (this.autoIQ && this.autoIQ.executor) {
      await this.autoIQ.executor.close();
    }
  }
}

module.exports = IosAppSmokeTest;