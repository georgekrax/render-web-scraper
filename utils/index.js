const puppeteerExtension = require("./puppeteer-extension");
const constants = require("./constants");

const selectDatePickerOption = async (page, { type, value }) => {
    // Click header to open selector (1 for month, 2 for year)
    await page.click(`#basicDatePickerPopUp table.bdpTitle > tbody > tr > th > span:nth-child(${type === 'month' ? 1 : 2})`);

    // Wait for selector popup
    const selectorId = `#basicDatePicker${type.charAt(0).toUpperCase() + type.slice(1)}Selector`;
    await page.waitForSelector(selectorId, { timeout: 500 });

    if (type === 'year') {
        let isFound = false;
        do {
            const yearLink = await page.$(`${selectorId} > a[y="${value}"]`);
            isFound = !!yearLink;

            if (!isFound) {
                // Scroll up 4 years at a time
                for (let i = 0; i < 4; i++) {
                    await page.click(`${selectorId} > a:nth-child(1)`);
                }
            }
        } while (!isFound);
    }

    // Click the option
    await page.click(`${selectorId} > a[${type[0]}="${value}"]`);
};

const formatNumber = (value, decimals = 2) => {
    return Number(parseFloat(value).toFixed(decimals));
};

module.exports = { ...puppeteerExtension, ...constants, selectDatePickerOption, formatNumber }