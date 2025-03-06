const { TimeoutError } = require("puppeteer-core");

const INVERTER_SELECTORS = {
  COOKIE_REJECT_BTN: "button#onetrust-reject-all-handler",
  COOKIE_BANNER: "#onetrust-banner-sdk",
  DATE_INPUT: "td input",
  DATE_PICKER: "#basicDatePickerPopUp",
  TABLE_ROW: "#ctl00_ContentPlaceHolder1_PublicPagePlaceholder1_PageUserControl_ctl00_UserControl0_DataGridOverview > tbody > tr",
  TABLE_COLUMN_HEADING: "#ctl00_ContentPlaceHolder1_PublicPagePlaceholder1_PageUserControl_ctl00_UserControl0_DataGridOverview > tbody > tr.base-grid-header > td:nth-child(2) > a",
  DATE_SELECTOR: (date) => {
    const formattedDate = `${date.format("YYYY")}/${date.get("month")}/${date.format("D")}`;
    return `a[d='${formattedDate}']`;
  }
};

const handleCookieConsent = async (page) => {
  try {
    await page.waitForSelector(INVERTER_SELECTORS.COOKIE_REJECT_BTN, { visible: true, timeout: 500 });
    await page.evaluate((selector) => document.querySelector(selector).click(), INVERTER_SELECTORS.COOKIE_REJECT_BTN);
    await waitForCondition(page, {
      selector: INVERTER_SELECTORS.COOKIE_BANNER,
      toBeVisible: false
    });
  } catch (err) {
    if (!(err instanceof TimeoutError)) throw err;
  }
}

const waitForCondition = async (page, options) => {
  const { timeout = 10000, interval = 250, ...restOptions } = options;
  
  return page.evaluate(async (params) => {
    return await new Promise((resolve, reject) => {
      const start = Date.now();
      let timeoutId;

      const check = () => {
        const el = document.querySelector(params.selector);
        let matchesText = false;
        let isVisible = false;
        console.log(matchesText, isVisible);

        if (typeof params.toBeVisible !== "undefined" || params.toBeVisible != null) {
          if (!el) isVisible = false;

          const style = window.getComputedStyle(el);
          isVisible = !(style.display === "none" || style.visibility === "hidden");
        }
        
        if (params.expectedText) {
          // Check for text match
          if (el.textContent.includes(params.expectedText)) matchesText = true;
        }

        if (matchesText || isVisible === params.toBeVisible) {
          clearTimeout(timeoutId);
          resolve();
          return;
        }
        
        if (Date.now() - start >= params.timeout) {
          clearTimeout(timeoutId);
          reject(`Timeout: Condition not met within ${params.timeout}ms`);
          return;
        }

        timeoutId = setTimeout(check, params.interval);
      };

      check();
    });
  }, { ...restOptions, timeout, interval });
};

module.exports = { INVERTER_SELECTORS, handleCookieConsent, waitForCondition };