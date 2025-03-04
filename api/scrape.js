const express = require("express");
const moment = require("moment");

const router = express.Router();

router.get("/scrape", async (req, res, next) => {
  const url = req.query.url;
  const _date = req.query.date;
  if (!url) return next();

  const page = await req.browser.newPage();
  await page.goto(url); // Replace with the actual URL of the page

  try {
    await page.waitForSelector("button#onetrust-reject-all-handler", { timeout: 1000 });
    await page.$eval("button#onetrust-reject-all-handler", (btn) => btn.click());
  } catch (err) {
    if (!err.message.includes("Waiting for selector `button#onetrust-reject-all-handler` failed")) return next(err);
  }

  
  if (_date) {
    await page.waitForSelector("td input");
    const _inputDate = await page.evaluate(() => {
      const inputField = document.querySelector("td input");
      inputField.click();
  
      return inputField.value;
    });
    
    const date = moment(new Date(_date));
    const inputDate = moment(new Date(_inputDate));

    if (date.isAfter(inputDate)) {
      return res.json({ error: "Error: Date requested is in the future" });
    }

    const formattedDate = `${date.format("YYYY")}/${date.get("month")}/${date.format("D")}`;

    await page.$(`a[d='${formattedDate}']`);
  }

  await page.close();

  return res.json({ title: "hey" });
});

module.exports = router;
