const fs = require("fs/promises");
const path = require("path");
const { Builder, By } = require("selenium-webdriver");
const WaitConfig = require("../config/WaitConfig");
const AutoIQExecutor = require("./AutoIQExecutor");

class IOSAdapter extends AutoIQExecutor {
  constructor(options = {}) {
    super();
    this.options = {
      platformName: "iOS",
      automationName: "XCUITest",
      deviceName: "iPhone Simulator",
      ...options
    };
    this.driver = null;
  }

  async initialize() {
    const capabilities = {
      platformName: "iOS",
      "appium:automationName": this.options.automationName,
      "appium:deviceName": this.options.deviceName,
      "appium:app": this.options.app,
      "appium:bundleId": this.options.bundleId,
      "appium:udid": this.options.udid,
      "appium:noReset": true,
      "appium:newCommandTimeout": 3600
    };

    if (this.options.browserName) {
      capabilities.browserName = this.options.browserName;
    }

    const builder = new Builder()
      .usingServer(process.env.APPIUM_URL || "http://127.0.0.1:4723")
      .withCapabilities(capabilities);

    if (this.options.browserName) {
      builder.forBrowser(this.options.browserName);
    }

    this.driver = await builder.build();

    await this.autoWaitForUiStability();
    return this;
  }

  async navigate(url) {
    this.ensureInitialized();
    await this.driver.get(url);
    await this.autoWaitForUiStability();
  }

  async getContexts() {
    this.ensureInitialized();
    return await this.driver.getContexts();
  }

  async switchContext(contextName) {
    this.ensureInitialized();
    await this.driver.switchContext(contextName);
    await this.autoWaitForUiStability();
  }

  async swipe(direction = "down") {
    this.ensureInitialized();
    await this.driver.executeScript("mobile: scroll", { direction });
    await this.autoWaitForUiStability();
  }

  async isVisible(locator) {
    const element = await this.findVisibleElement(locator);
    return element.isDisplayed();
  }

  async apiRequest() {
    throw new Error("apiRequest is not supported in IOSAdapter. Use APIAdapter instead.");
  }

  async takeScreenshot(fileName) {
    const image = await this.driver.takeScreenshot();
    await fs.mkdir(path.dirname(fileName), { recursive: true });
    await fs.writeFile(fileName, image, "base64");
  }

  async smartClick(locator) {
    const element = await this.findClickableElement(locator);
    await element.click();
    await this.autoWaitForUiStability();
  }

  async smartType(locator, value) {
    const element = await this.findVisibleElement(locator);
    await element.clear();
    await element.sendKeys(value);
    await this.autoWaitForUiStability();
  }

  async close() {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
    }
  }

  async autoWaitForUiStability() {
    this.ensureInitialized();
    const deadline = Date.now() + WaitConfig.DEFAULT_TIMEOUT;
    let lastSignature = "";
    let stablePolls = 0;

    while (Date.now() < deadline) {
      const signature = await this.captureUiSignature();
      if (signature === lastSignature) {
        stablePolls += 1;
      } else {
        lastSignature = signature;
        stablePolls = 0;
      }

      if (stablePolls >= WaitConfig.UI_STABLE_POLLS) return;
      await this.delay(WaitConfig.POLLING_INTERVAL);
    }
  }

  async captureUiSignature() {
    try {
      // Using page source as a signature for mobile UI stability
      return await this.driver.getPageSource();
    } catch {
      return `unstable-${Date.now()}`;
    }
  }

  async findVisibleElement(locator, timeoutMs = WaitConfig.DEFAULT_TIMEOUT) {
    return this.waitForElement(locator, async el => el.isDisplayed(), `Element not visible: ${locator}`, timeoutMs);
  }

  async findClickableElement(locator, timeoutMs = WaitConfig.DEFAULT_TIMEOUT) {
    return this.waitForElement(locator, async el => 
      (await el.isDisplayed()) && (await el.isEnabled()), 
      `Element not clickable: ${locator}`, 
      timeoutMs
    );
  }

  async waitForElement(locator, predicate, timeoutMessage, timeoutMs) {
    this.ensureInitialized();
    const by = this.toBy(locator);
    return this.driver.wait(async () => {
      const elements = await this.driver.findElements(by);
      for (const el of elements) {
        try { if (await predicate(el)) return el; } catch {}
      }
      return null;
    }, timeoutMs, timeoutMessage, WaitConfig.POLLING_INTERVAL);
  }

  ensureInitialized() {
    if (!this.driver) throw new Error("IOSAdapter is not initialized. Call initialize() first.");
  }

  toBy(locator) {
    if (!locator || !String(locator).trim()) {
      throw new Error("Locator must not be blank");
    }

    const trimmed = String(locator).trim();
    const normalized = trimmed.toLowerCase();

    if (normalized.startsWith("text=")) {
      const text = this.stripMatchingQuotes(trimmed.slice(5).trim());
      const literal = this.toXPathLiteral(text);
      // Support both Native (label/name) and Web (text content) for hybrid capability
      return By.xpath(`//*[@label=${literal} or @name=${literal} or @value=${literal} or contains(text(), ${literal})]`);
    }

    if (normalized.startsWith("xpath=")) {
      return By.xpath(trimmed.slice(6).trim());
    }

    if (normalized.startsWith("name=")) {
      return By.name(trimmed.slice(5).trim());
    }

    if (normalized.startsWith("id=")) {
      return By.id(trimmed.slice(3).trim());
    }

    if (trimmed.startsWith("//")) {
      return By.xpath(trimmed);
    }

    // Default to Accessibility ID for Appium
    return By.id(trimmed);
  }

  stripMatchingQuotes(value) {
    if (value.length >= 2) {
      const first = value[0];
      const last = value[value.length - 1];
      if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
        return value.slice(1, -1);
      }
    }
    return value;
  }

  toXPathLiteral(value) {
    if (!value) return "''";
    if (!value.includes("'")) return `'${value}'`;
    if (!value.includes('"')) return `"${value}"`;

    const parts = [];
    let segment = "";

    for (const character of value) {
      if (character === "'" || character === '"') {
        if (segment) {
          parts.push(`'${segment}'`);
          segment = "";
        }
        parts.push(character === "'" ? "\"'\"" : "'\"'");
      } else {
        segment += character;
      }
    }

    if (segment) {
      parts.push(`'${segment}'`);
    }

    return `concat(${parts.join(", ")})`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = IOSAdapter;