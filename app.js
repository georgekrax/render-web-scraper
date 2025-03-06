require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const inverterProductionRouter = require('./api/inverter-daily-production');

const app = express();
const port = 3000;

(async () => {
  let executablePath = process.env.CHROME_EXECUTABLE_PATH;
  if (!executablePath) executablePath = await chromium.executablePath();
  
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });
  
  // Middleware to attach the browser instance to the request object
  app.use(async (req, res, next) => {
    req.browser = browser;
    next();
  });

  app.use(express.json());
  app.use('/api', inverterProductionRouter);

  app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
  });

  // Handle server shutdown
  process.on('SIGINT', async () => {
    await browser.close();
    process.exit();
  });
})();