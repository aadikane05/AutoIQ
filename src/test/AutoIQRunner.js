const AutoIQTestListener = require("../listener/AutoIQTestListener");
const AutoIQReportManager = require("../report/AutoIQReportManager");
const ApiSmokeTest = require("./api/ApiSmokeTest");
const GoogleSearchTest = require("./browser/GoogleSearchTest");
const DesktopAppSmokeTest = require("./desktopApp/DesktopAppSmokeTest");
const IosAppSmokeTest = require("./mobileTest/IosAppSmokeTest");
const IosBrowserSearchTest = require("./mobileTest/IosBrowserSearchTest");
const AndroidAppSmokeTest = require("./mobileTest/AndroidAppSmokeTest");
const AndroidBrowserSearchTest = require("./mobileTest/AndroidBrowserSearchTest");

function getRequestedCategory() {
  const categoryArg = process.argv.find(argument => argument.startsWith("--category="));

  if (categoryArg) {
    return categoryArg.split("=")[1];
  }

  return process.env.AUTOIQ_CATEGORY || "all";
}

function getRequestedTestName() {
  const testArg = process.argv.find(argument => argument.startsWith("--test="));

  if (testArg) {
    return testArg.split("=")[1];
  }

  return null;
}

function getTestsByCategory() {
  return {
    api: [
      {
        name: "apiSmokeTest",
        TestClass: ApiSmokeTest,
        methodName: "apiSmokeTest"
      }
    ],
    browser: [
      {
        name: "googleSearchTest",
        TestClass: GoogleSearchTest,
        methodName: "googleSearchTest"
      }
    ],
    desktopApp: [
      {
        name: "desktopAppSmokeTest",
        TestClass: DesktopAppSmokeTest,
        methodName: "desktopAppSmokeTest"
      }
    ],
    mobile: [
      {
        name: "iosAppSmokeTest",
        TestClass: IosAppSmokeTest,
        methodName: "iosAppSmokeTest"
      },
      {
        name: "iosBrowserSearchTest",
        TestClass: IosBrowserSearchTest,
        methodName: "iosBrowserSearchTest"
      },
      {
        name: "androidAppSmokeTest",
        TestClass: AndroidAppSmokeTest,
        methodName: "androidAppSmokeTest"
      },
      {
        name: "androidBrowserSearchTest",
        TestClass: AndroidBrowserSearchTest,
        methodName: "androidBrowserSearchTest"
      }
    ]
  };
}

function getTestsForCategory(category) {
  const testsByCategory = getTestsByCategory();

  if (category === "all") {
    return [
      ...testsByCategory.api,
      ...testsByCategory.browser,
      ...testsByCategory.desktopApp,
      ...testsByCategory.mobile
    ];
  }

  if (!testsByCategory[category]) {
    const supported = ["all", ...Object.keys(testsByCategory)].join(", ");
    throw new Error(`Unknown category '${category}'. Supported categories: ${supported}`);
  }

  return testsByCategory[category];
}

async function runTest(test, listener) {
  const { name, TestClass, methodName, skip } = test;
  const instance = new TestClass();

  if (skip) {
    await listener.onTestSkipped({ name, instance, reason: skip });
    console.log(`[SKIP] ${name} | ${skip}`);
    return { name, status: "SKIP", reason: skip };
  }

  try {
    await instance.setUp();
    await instance[methodName]();
    await listener.onTestSuccess({ name, instance });
    return { name, status: "PASS" };
  } catch (error) {
    await listener.onTestFailure({ name, instance, error });
    console.error(`[FAIL] ${name}`);
    console.error(error);
    return { name, status: "FAIL", error };
  } finally {
    await instance.tearDown().catch(teardownError => {
      console.error(`[TEARDOWN] ${name}`);
      console.error(teardownError);
    });
  }
}

async function runSuite() {
  AutoIQReportManager.reset();

  const listener = new AutoIQTestListener();
  const requestedCategory = getRequestedCategory();
  const requestedTestName = getRequestedTestName();
  
  let tests = getTestsForCategory(requestedCategory);

  if (requestedTestName) {
    tests = tests.filter(test => test.name === requestedTestName);
    if (tests.length === 0) {
      console.error(`[AutoIQ] No test found with name: ${requestedTestName}`);
      process.exitCode = 1;
      return [];
    }
  }

  const results = [];
  for (const test of tests) {
    results.push(await runTest(test, listener));
  }

  await listener.onFinish();

  const failed = results.filter(result => result.status === "FAIL").length;
  const skipped = results.filter(result => result.status === "SKIP").length;
  const passed = results.filter(result => result.status === "PASS").length;

  console.log(
    `[AutoIQ] Category: ${requestedCategory} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`
  );

  if (failed > 0) {
    process.exitCode = 1;
  }

  return results;
}

if (require.main === module) {
  runSuite().catch(error => {
    console.error("[AutoIQ] Runner failed");
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  runSuite
};
