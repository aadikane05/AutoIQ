const fs = require("fs/promises");
const path = require("path");
const { Builder, Browser, By } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const WaitConfig = require("../config/WaitConfig");
const AutoIQExecutor = require("./AutoIQExecutor");
const AutoIQResponse = require("../model/AutoIQResponse");

class WebAdapter extends AutoIQExecutor {
  constructor(options = {}) {
    super();
    this.options = {
      browserName: Browser.CHROME,
      headless: process.env.AUTOIQ_HEADLESS === "true",
      startUrl: WaitConfig.GOOGLE_URL,
      ...options
    };
    this.driver = null;
  }

  async initialize() {
    const chromeOptions = new chrome.Options();
    chromeOptions.addArguments("--start-maximized");
    chromeOptions.addArguments("--disable-notifications");

    if (this.options.headless) {
      chromeOptions.addArguments("--headless=new");
      chromeOptions.addArguments("--window-size=1440,1024");
    }

    this.driver = await new Builder()
      .forBrowser(this.options.browserName)
      .setChromeOptions(chromeOptions)
      .build();

    await this.driver.manage().setTimeouts({
      pageLoad: WaitConfig.DEFAULT_TIMEOUT,
      script: WaitConfig.DEFAULT_TIMEOUT,
      implicit: 0
    });

    await this.driver.get(this.options.startUrl);
    await this.dismissConsentIfPresent();
    await this.autoWaitForUiStability();
    return this;
  }

  async isVisible(locator) {
    const element = await this.findVisibleElement(locator);
    return element.isDisplayed();
  }

  async apiRequest(method = "GET", url, body = "") {
    try {
      const response = await fetch(url, {
        method: String(method || "GET").trim().toUpperCase(),
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body || undefined
      });

      return new AutoIQResponse(response.status, await response.text());
    } catch (error) {
      return new AutoIQResponse(500, String(error?.message || error));
    }
  }

  async waitForPageLoad() {
    await this.autoWaitForUiStability();
  }

  async waitForVisible(locator) {
    return this.findVisibleElement(locator);
  }

  async takeScreenshot(fileName) {
    await this.autoWaitForUiStability().catch(() => undefined);
    const image = await this.driver.takeScreenshot();
    await fs.mkdir(path.dirname(fileName), { recursive: true });
    await fs.writeFile(fileName, image, "base64");
  }

  async type(locator, value) {
    await this.smartType(locator, value);
  }

  async click(locator) {
    await this.smartClick(locator);
  }

  async scrollDown() {
    await this.scrollBy(WaitConfig.SCROLL_OFFSET);
  }

  async scrollUp() {
    await this.scrollBy(-WaitConfig.SCROLL_OFFSET);
  }

  async close() {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
    }
  }

  async smartClick(locator) {
    const element = await this.findClickableElement(locator);
    await this.driver.executeScript(
      "arguments[0].scrollIntoView({block: 'center', inline: 'center'});",
      element
    );
    await element.click();
    await this.autoWaitForUiStability();
  }

  async smartType(locator, value) {
    const element = await this.findVisibleElement(locator);
    await this.driver.executeScript(
      "arguments[0].scrollIntoView({block: 'center', inline: 'center'});",
      element
    );
    await element.clear();
    await element.sendKeys(value);
    await this.autoWaitForUiStability();
  }

  async dismissConsentIfPresent() {
    if (await this.clickConsentButtonInCurrentContext()) {
      return;
    }

    const frames = await this.driver.findElements(By.css("iframe"));
    for (const frame of frames) {
      try {
        await this.driver.switchTo().frame(frame);
        if (await this.clickConsentButtonInCurrentContext()) {
          return;
        }
      } catch {
        // Ignore transient iframe errors and continue checking.
      } finally {
        await this.driver.switchTo().defaultContent();
      }
    }
  }

  async clickConsentButtonInCurrentContext() {
    const candidates = [
      this.toBy("text=Accept all"),
      this.toBy("text=I agree"),
      By.xpath("//button[contains(., 'Accept all') or contains(., 'I agree')]")
    ];

    for (const candidate of candidates) {
      const elements = await this.driver.findElements(candidate);

      for (const element of elements) {
        try {
          if (await element.isDisplayed() && await element.isEnabled()) {
            await element.click();
            await this.autoWaitForUiStability();
            return true;
          }
        } catch {
          // Ignore stale consent elements and keep searching.
        }
      }
    }

    return false;
  }

  async scrollBy(offset) {
    await this.driver.executeScript("window.scrollBy(0, arguments[0]);", offset);
    await this.autoWaitForUiStability();
  }

  async autoWaitForUiStability() {
    this.ensureInitialized();

    const deadline = Date.now() + WaitConfig.DEFAULT_TIMEOUT;
    let lastSignature = "";
    let stablePolls = 0;

    while (Date.now() < deadline) {
      const readyState = await this.getReadyState();
      if (readyState !== "complete") {
        stablePolls = 0;
        lastSignature = "";
        await this.delay(WaitConfig.POLLING_INTERVAL);
        continue;
      }

      const signature = await this.captureUiSignature();

      if (signature === lastSignature) {
        stablePolls += 1;
      } else {
        lastSignature = signature;
        stablePolls = 0;
      }

      if (stablePolls >= WaitConfig.UI_STABLE_POLLS) {
        return;
      }

      await this.delay(WaitConfig.POLLING_INTERVAL);
    }

    throw new Error("AutoIQ auto wait timeout: UI did not stabilize");
  }

  async findVisibleElement(locator, timeoutMs = WaitConfig.DEFAULT_TIMEOUT) {
    return this.waitForElement(
      locator,
      async element => this.isElementVisible(element),
      `Element not visible: ${locator}`,
      timeoutMs
    );
  }

  async findClickableElement(locator, timeoutMs = WaitConfig.DEFAULT_TIMEOUT) {
    return this.waitForElement(
      locator,
      async element =>
        (await this.isElementVisible(element)) &&
        (await this.isElementEnabled(element)),
      `Element not clickable: ${locator}`,
      timeoutMs
    );
  }

  async waitForElement(locator, predicate, timeoutMessage, timeoutMs) {
    this.ensureInitialized();
    const by = this.toBy(locator);

    return this.driver.wait(
      async () => {
        const elements = await this.driver.findElements(by);

        for (const element of elements) {
          try {
            if (await predicate(element)) {
              return element;
            }
          } catch {
            // Retry while the DOM is settling.
          }
        }

        return null;
      },
      timeoutMs,
      timeoutMessage,
      WaitConfig.POLLING_INTERVAL
    );
  }

  async isElementVisible(element) {
    try {
      return await element.isDisplayed();
    } catch {
      return false;
    }
  }

  async isElementEnabled(element) {
    try {
      return await element.isEnabled();
    } catch {
      return false;
    }
  }

  async getReadyState() {
    try {
      return await this.driver.executeScript("return document.readyState;");
    } catch {
      return "loading";
    }
  }

  async captureUiSignature() {
    try {
      return await this.driver.executeScript(`
        const body = document.body;
        return [
          document.readyState,
          window.location.href,
          Math.round(window.scrollY),
          body ? body.scrollHeight : 0,
          document.getElementsByTagName('*').length
        ].join('|');
      `);
    } catch {
      return `unstable-${Date.now()}`;
    }
  }

  ensureInitialized() {
    if (!this.driver) {
      throw new Error("WebAdapter is not initialized. Call initialize() first.");
    }
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
      return By.xpath(
        `(//a[contains(normalize-space(.), ${literal})]` +
          ` | //button[contains(normalize-space(.), ${literal})]` +
          ` | //*[contains(normalize-space(.), ${literal}) and not(.//*[contains(normalize-space(.), ${literal})])])[1]`
      );
    }

    if (normalized.startsWith("xpath=")) {
      return By.xpath(trimmed.slice(6).trim());
    }

    if (normalized.startsWith("css=")) {
      return By.css(trimmed.slice(4).trim());
    }

    if (normalized.startsWith("id=")) {
      return By.id(trimmed.slice(3).trim());
    }

    if (normalized.startsWith("name=")) {
      return By.name(trimmed.slice(5).trim());
    }

    if (trimmed.startsWith("//") || trimmed.startsWith("(//")) {
      return By.xpath(trimmed);
    }

    return By.css(trimmed);
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
    if (!value) {
      return "''";
    }

    if (!value.includes("'")) {
      return `'${value}'`;
    }

    if (!value.includes('"')) {
      return `"${value}"`;
    }

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
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }
}

module.exports = WebAdapter;
