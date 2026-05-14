const AutoIQ = require("../../core/AutoIQ");
const AndroidAdapter = require("../../executor/AndroidAdapter");

class AndroidAppSmokeTest {
  constructor() {
    this.autoIQ = null;
  }

  async setUp() {
    // Example configuration for the Android Settings app
    this.autoIQ = new AutoIQ(new AndroidAdapter({
      appPackage: "com.android.settings",
      appActivity: "com.android.settings.Settings",
      deviceName: "emulator-5554"
    }));
    await this.autoIQ.executor.initialize();
  }

  async androidAppSmokeTest() {
    // Validate the app is loaded by checking for a common settings item
    const isBatteryVisible = await this.autoIQ.isVisible("text=Battery");
    
    if (!isBatteryVisible) {
      throw new Error("Android Settings app failed to load: 'Battery' section not found.");
    }

    console.log(`ANDROID MOBILE CONFIDENCE SCORE = ${this.autoIQ.confidenceScore().toFixed(2)}`);
  }

  async tearDown() {
    if (this.autoIQ && this.autoIQ.executor) {
      await this.autoIQ.executor.close();
    }
  }
}

module.exports = AndroidAppSmokeTest;