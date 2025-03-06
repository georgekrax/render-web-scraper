const express = require("express");
const moment = require("moment");

const { INVERTER_SELECTORS, handleCookieConsent, waitForCondition, selectDatePickerOption, formatNumber } = require('../utils');

const router = express.Router();

const NUMBER_OF_STRINGS = 3; // Strings per inverter

router.post("/inverter-daily-production", async (req, res, next) => {
  const { url, date: _date } = req.body;
  if (!url) return next();

  const page = await req.browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  // page.on('console', message => console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))

  // Cookies
  await handleCookieConsent(page);
  
  await page.waitForSelector(INVERTER_SELECTORS.DATE_INPUT, { visible: true });
  const _currentDate = await page.$eval(INVERTER_SELECTORS.DATE_INPUT, (el) => el.value);
  
  const date = moment(_date ? new Date(req.query.date) : undefined);
  const currentDate = moment(new Date(_currentDate));
  
  if (date.isAfter(moment())) {
    return res.status(400).send({ error: { message: "Date requested is in the future" } });
  }
  
  await page.click(INVERTER_SELECTORS.DATE_INPUT);
  await page.waitForSelector(INVERTER_SELECTORS.DATE_PICKER, { visible: true });

  const dateSelector = INVERTER_SELECTORS.DATE_SELECTOR(date);
  const dateLink = await page.$(dateSelector);
  
  if (!(!!dateLink)) {
    const month = date.month();
    if (month != currentDate.month()) {
      await selectDatePickerOption(page, { type:"month", value: month });
    }
    
    const year = date.year();
    if (year != currentDate.year()) {
      await selectDatePickerOption(page, { type:"year", value: year });
    }

    await page.waitForSelector(dateSelector, { visible: true });
  }

  await page.click(dateSelector);

  await waitForCondition(page, {
    selector: INVERTER_SELECTORS.TABLE_COLUMN_HEADING,
    expectedText: date.format("M/D/YYYY")
  });

  const inverters = await page.$$eval(
    INVERTER_SELECTORS.TABLE_ROW,
    (rows, NUMBER_OF_STRINGS) => rows.filter(el => el.className.includes("base-grid-item")).map(row => {
      const columns = row.querySelectorAll("td");
      const deviceInfo = columns[0].textContent;
      const lastSpaceIndex = deviceInfo.lastIndexOf(" ");

      // Can't use external function within page.$$eval()
      const formatNumberFn = (value, decimals = 2) => {
        return Number(parseFloat(value).toFixed(decimals));
      };

      const dailyKwh = formatNumberFn(columns[1].textContent);

      return {
        device: {
          id: deviceInfo.slice(lastSpaceIndex + 1),
          product: deviceInfo.slice(0, lastSpaceIndex),
          is_active: !isNaN(dailyKwh)
        },
        daily_production: {
          kwh: dailyKwh,
          avg_string: formatNumberFn(((dailyKwh ?? 0) / NUMBER_OF_STRINGS))
        }
      };
    }),
    NUMBER_OF_STRINGS
  );
  
  await page.close();

  const activeInverters = inverters.filter(inverter => inverter.device.is_active);

  const total_daily_production = activeInverters.reduce((partialSum, inverter) => formatNumber(partialSum + inverter.daily_production.kwh), 0);
  const avg_inverter_production = formatNumber(total_daily_production / activeInverters.length);
  const avg_string_production = formatNumber(avg_inverter_production / NUMBER_OF_STRINGS);

  return res.status(200).json({ 
    data: { 
      total_daily_production, 
      avg_inverter_production,
      avg_string_production,
      inverters 
    }
  });
});

module.exports = router;