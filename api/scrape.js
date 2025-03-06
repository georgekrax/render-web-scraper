const express = require("express");
const moment = require("moment");

const { waitForCondition, selectDatePickerOption } = require('../utils');

const router = express.Router();

router.get("/inverter-daily-production", async (req, res, next) => {
  const url = req.query.url;
  const _date = req.query.date || moment().format("YYYY-MM-DD");
  if (!url) return next();

  const page = await req.browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  page.on('console', message => console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))

  // Cookies
  try {
    await page.waitForSelector("button#onetrust-reject-all-handler", { visible: true, timeout: 500 });
    await page.evaluate(() => document.querySelector("button#onetrust-reject-all-handler").click());
  } catch (err) {
    if ((err instanceof TimeoutError)) return next(err);
  }

  await waitForCondition(page, {
    selector: "#onetrust-banner-sdk",
    expectedStyles: { display: "none" }
  });

  await page.waitForSelector("td input", { visible: true });
  const _currentDate = await page.$eval("td input", (el) => el.value);
  
  const date = moment(new Date(_date));
  const currentDate = moment(new Date(_currentDate));
  
  if (date.isAfter(moment())) {
    return res.status(400).send({ message: "Date requested is in the future" });
  }
  
  await page.click("td input");
  await page.waitForSelector("#basicDatePickerPopUp", { visible: true });

  const formattedDate = `${date.format("YYYY")}/${date.get("month")}/${date.format("D")}`;
  const dateLink = await page.$(`a[d='${formattedDate}']`);
  
  if (!(!!dateLink)) {
    const month = date.month();
    if (month != currentDate.month()) {
      await selectDatePickerOption(page, { type:"month", value: month });
    }
    
    const year = date.year();
    if (year != currentDate.year()) {
      await selectDatePickerOption(page, { type:"year", value: year });
    }

    await page.waitForSelector(`a[d='${formattedDate}']`, { visible: true });
  }

  await page.click(`a[d='${formattedDate}']`);

  await waitForCondition(page, {
    selector: "#ctl00_ContentPlaceHolder1_PublicPagePlaceholder1_PageUserControl_ctl00_UserControl0_DataGridOverview > tbody > tr.base-grid-header > td:nth-child(2) > a",
    expectedText: date.format("M/D/YYYY")
  });

  await page.screenshot({ path: "final.jpg" });

  // TODO: Total production and average 
  const data = await page.$$eval(
    "#ctl00_ContentPlaceHolder1_PublicPagePlaceholder1_PageUserControl_ctl00_UserControl0_DataGridOverview > tbody > tr",
    (rows) => rows.filter(el => el.className.includes("base-grid-item")).map(row => {
      const columns = row.querySelectorAll("td");
      const deviceInfo = columns[0].textContent;
      const lastSpaceIndex = deviceInfo.lastIndexOf(" ");

      return {
        inverter: {
          id: deviceInfo.slice(lastSpaceIndex + 1),
          productType: deviceInfo.slice(0, lastSpaceIndex)
        },
        kwhProduction: parseFloat(columns[1].textContent)
      };
    })
  );

  await page.close();

  return res.status(200).json({ data });
});

module.exports = router;