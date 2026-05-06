const fs = require("fs/promises");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const AutoIQExecutor = require("./AutoIQExecutor");
const AutoIQResponse = require("../model/AutoIQResponse");

const execFileAsync = promisify(execFile);
const CALCULATOR_APP = "/System/Applications/Calculator.app";

class DesktopAdapter extends AutoIQExecutor {
  constructor() {
    super();
    this.expressionBuffer = "";
  }

  async initialize() {
    await this.activateCalculator();
    await this.delay(500);
    await this.clear();
  }

  async smartClick(locator) {
    const key = this.normalizeLocator(locator);

    if (key === "=") {
      if (!this.expressionBuffer) {
        throw new Error("No desktop calculator expression is buffered");
      }

      await this.evaluateExpression(this.expressionBuffer);
      return;
    }

    if (key.toLowerCase() === "c" || key.toLowerCase() === "ac") {
      await this.clear();
      return;
    }

    this.expressionBuffer += this.mapKey(key);
    await this.delay(100);
  }

  async smartType(locator, value) {
    const expression = String(locator === "expression" ? value : value ?? locator);
    const compactExpression = expression.replaceAll(/\s+/g, "");
    const shouldEvaluate = compactExpression.endsWith("=");
    const normalizedExpression = shouldEvaluate
      ? compactExpression.slice(0, -1)
      : compactExpression;

    if (!normalizedExpression) {
      throw new Error("Desktop calculator expression must not be blank");
    }

    this.expressionBuffer = normalizedExpression;

    if (shouldEvaluate) {
      await this.evaluateExpression(this.expressionBuffer);
    }
  }

  async isVisible(locator) {
    const normalized = String(locator).trim();

    if (normalized.toLowerCase() === "calculator") {
      const { stdout } = await execFileAsync("defaults", ["read", "com.apple.calculator", "CFBundleIdentifier"])
        .catch(() => ({ stdout: "" }));
      return String(stdout).trim() === "com.apple.calculator";
    }

    if (normalized.toLowerCase().startsWith("result=")) {
      const expected = normalized.slice(7).trim();
      const actual = await this.getDisplayValue();
      return this.valuesMatch(actual, expected);
    }

    throw new Error(`Unsupported desktop locator: ${locator}`);
  }

  async apiRequest() {
    return new AutoIQResponse(501, "Desktop API flow is not supported");
  }

  async takeScreenshot(fileName) {
    await fs.mkdir(path.dirname(fileName), { recursive: true });
    try {
      await execFileAsync("screencapture", ["-x", fileName]);
    } catch (error) {
      console.warn(`[DesktopAdapter] Screenshot unavailable: ${error.stderr || error.message}`);
    }
  }

  async close() {
    await this.runAppleScript(`tell application "Calculator" to quit`).catch(() => undefined);
  }

  async clear() {
    this.expressionBuffer = "";
    await this.delay(250);
  }

  async getDisplayValue() {
    const { stdout } = await execFileAsync("defaults", [
      "read",
      "com.apple.calculator",
      "LastResultValue"
    ]);
    return String(stdout).trim();
  }

  async activateCalculator() {
    await execFileAsync("open", ["-a", CALCULATOR_APP]);
  }

  mapKey(key) {
    const value = String(key).trim();

    if (!value) {
      throw new Error("Desktop calculator key must not be blank");
    }

    if (value === "×") {
      return "*";
    }

    if (value === "÷") {
      return "/";
    }

    return value.toLowerCase() === "ac" ? "c" : value;
  }

  normalizeLocator(locator) {
    const value = String(locator).trim();

    if (!value) {
      throw new Error("Desktop locator must not be blank");
    }

    return value.startsWith("button=") ? value.slice(7).trim() : value;
  }

  valuesMatch(actual, expected) {
    const normalizedActual = this.normalizeValue(actual);
    const normalizedExpected = this.normalizeValue(expected);

    const actualNumber = Number(normalizedActual);
    const expectedNumber = Number(normalizedExpected);

    if (!Number.isNaN(actualNumber) && !Number.isNaN(expectedNumber)) {
      return actualNumber === expectedNumber;
    }

    return normalizedActual === normalizedExpected;
  }

  normalizeValue(value) {
    return String(value).replaceAll(",", "").trim();
  }

  async evaluateExpression(expression) {
    await this.activateCalculator();
    await execFileAsync("open", [`calc://?expression=${encodeURIComponent(expression)}`]);
    this.expressionBuffer = "";
    await this.delay(500);
  }

  async runAppleScript(script) {
    const { stdout } = await execFileAsync("osascript", ["-e", script]);
    return String(stdout).trim().toLowerCase();
  }

  delay(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }
}

module.exports = DesktopAdapter;
