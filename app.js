const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const scrapeRouter = require('./api/scrape.js');

const app = express();
const port = 3000;

(async () => {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
  });
  
  // Middleware to attach the browser instance to the request object
  app.use(async (req, res, next) => {
    req.browser = browser;
    next();
  });

  // Now, you can use scrapeRouter without directly passing the browser
  app.use('/api', scrapeRouter);

  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });

  // Handle server shutdown
  process.on('SIGINT', async () => {
    await browser.close();
    process.exit();
  });
})();