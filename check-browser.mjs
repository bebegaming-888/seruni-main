import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  page.on("pageerror", (err) => {
    console.log(`[BROWSER UNCAUGHT EXCEPTION] ${err.message}`);
  });

  try {
    await page.goto("http://localhost:8080/");
    await page.waitForTimeout(3000); // Wait for potential crashes

    // Save screenshot
    await page.screenshot({ path: "screenshot.png" });
    console.log("Screenshot saved to screenshot.png");

    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    console.log(`Body HTML length: ${bodyHtml.length} characters`);

    // Dump a snippet of the main content wrapper
    const mainContent = await page.evaluate(() => {
      const el = document.getElementById("main-content") || document.body;
      return el.innerHTML.substring(0, 1000);
    });
    console.log("Main content snippet:", mainContent);
  } catch (err) {
    console.error("Navigation failed:", err);
  } finally {
    await browser.close();
  }
})();
