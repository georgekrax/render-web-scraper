const { CONTRACT_TYPES, OWNERSHIP_TYPES, PROPERTY_TYPES } = require("./constants");
const { AADE_SELECTORS } = require("./puppeteer-extension");
const moment = require("moment");

const loginToAADE = async (page, { username, password }, { newURLIncludesText }) => {
    await page.waitForSelector("input#username", { visible: true });
    await page.type("input#username", username);

    await page.waitForSelector("input#password", { visible: true });
    await page.type("input#password", password);

    await page.click("button[type='submit']");

    await page.waitForFunction((newURLIncludesText, AADE_SELECTORS) => {
        const { href } = window.location;
        return !href.includes(AADE_SELECTORS.URL_INCLUDES.LOGIN) && (newURLIncludesText ? href.includes(newURLIncludesText) : true);
    }, {}, newURLIncludesText, AADE_SELECTORS);
};

const fillLandlordDetails = async (page, landlords) => {
    for (let i = 0; i < landlords.length; i++) {
        const { taxId, percentage, ownership } = landlords[i];

        // await page.waitForFunction(() => window.location.href.includes("gsis-flow"));
        await page.waitForFunction((i) => {
            const element = document.querySelector(`input#lessorAfm${i}`);
            return !!element;
        }, {}, i);
        // await page.waitForSelector(`input#lessorAfm${i}`);
        await page.type(`input#lessorAfm${i}`, taxId);
        await page.waitForSelector("div#messageZone", { hidden: true });

        // await page.screenshot({ path: `screenshot_${i}1.png`, type: "png" });
        
        await page.type(`input[name='submission.contentAsObject.contractorsDetails.lessorsList.lessor[${i}].percentage']`, percentage.toString());
        const ownershipId = (OWNERSHIP_TYPES[ownership.toUpperCase()] + 1).toString();
        await page.select(`select[name='submission.contentAsObject.contractorsDetails.lessorsList.lessor[${i}].ownership']`, ownershipId);
        
        // Blur
        await page.click("body");
        
        if (i != landlords.length - 1) {
            await page.focus("table.kadtable2 a");
            await page.click("table.kadtable2 a");
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        // await page.screenshot({ path: `screenshot_${i}2.png`, type: "png" });
    }
};

const fillTenantDetails = async (page, tenants) => {
    for (let i = 0; i < tenants.length; i++) {
        const { taxId } = tenants[i];
        
        await page.focus("table.textbluelec5 a");
        await page.click("table.textbluelec5 a");
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await page.waitForFunction(() => window.location.href.includes("gsis-flow"));
        await page.waitForSelector(`input#leaseholderAfm${i}`);
        await page.type(`input#leaseholderAfm${i}`, taxId);
        await page.waitForSelector("div#messageZone", { hidden: true });
        
        // await page.type(`input[name='submission.contentAsObject.contractorsDetails.lessorsList.lessor[${i}].percentage']`, percentage.toString());
        // const ownershipId = (OWNERSHIP_TYPES[ownership.toUpperCase()] + 1).toString();
        // await page.select(`select[name='submission.contentAsObject.contractorsDetails.lessorsList.lessor[${i}].ownership']`, ownershipId);
        
        // Blur
        await page.click("body");
    }
};

const fillContractDetails = async (page, contract, allowSubLease, notes) => {
    const { type, signed_date, from, to, monthly_rent } = contract;
    await page.waitForFunction(() => window.location.href.includes("gsis-flow"));
    await page.waitForSelector("select#selectmultiple");
    
    const contractTypeId = (CONTRACT_TYPES[type.toUpperCase()] + 1).toString();
    await page.select("select#selectmultiple", contractTypeId);
    await page.type("input#leasingSignatureDate", moment(signed_date).format("DD/MM/YYYY"));
    await page.type("input#leasingStartDate", moment(from).format("DD/MM/YYYY"));
    await page.type("input#leasingEndDate", moment(to).format("DD/MM/YYYY"));

    // Blur
    await page.click("body");

    await page.focus("input#monthlyRent");
    await page.type("input#monthlyRent", monthly_rent.toString());

    if (!allowSubLease) {
        // Ensures it's checked
        await page.$eval("input[name='submission.contentAsObject.contractDetails.subleasingTermExists']", checkbox => {
            if (!checkbox.checked) checkbox.click();
        });
    }

    if (notes) {
        await page.type("textarea[name='submission.contentAsObject.contractDetails.comments']", notes);
    }
};

const fillProperties = async (page, properties) => {
    for (let i = 0; i < properties.length; i++) {
        const { energy_certificate, ...property } = properties[i];

        await page.evaluate(() => {
            const linksArr = Array.from(document.querySelectorAll(".textbluelec2 > a"));
            linksArr[linksArr.length - 1].click();
        });

        
        await page.waitForSelector(`table#propertyTable${i}`);
        await page.evaluate((i) => {
            const element = document.querySelector(`table#propertyTable${i}`);
            if(element) element.scrollIntoView();
          }, i);
        
        const propertyTypeId = (PROPERTY_TYPES[property.type.toUpperCase()] + 1).toString();
        await page.select(`select[name='submission.contentAsObject.properties.propertyDetails[${i}].propertyType']`, propertyTypeId);
        
        await page.type(`input#atak${i}`, property.atak);
        await page.type(`input#street${i}`, property.address_name);
        await page.type(`input#streetNo${i}`, property.address_number.toString());
        await page.type(`input#zip${i}`, property.postal_code.toString());
        await page.type(`textarea[name='submission.contentAsObject.properties.propertyDetails[${i}].propertyDescription']`, property.description);
        await page.type(`input#kaek${i}`, property.kaek);
        await page.type(`input#area${i}`, property.area);
        await page.type(`input#district${i}`, property.district);
        await page.type(`input#floor${i}`, property.floor_no.toString());
        await page.type(`input#mainSurfaceArea${i}`, property.main_area_sq.toString());
        
        if (property.extra_area_sq) {
            await page.type(`input#auxSurfaceArea${i}`, property.extra_area_sq.toString());
        }
        
        if (property.elecricity_id) {
            await page.type(`input#dehCode${i}`, property.elecricity_id.toString());
        } else {
            await page.$eval(`input#noElectricPowerSupply${i}`, checkbox => {
                if (!checkbox.checked) checkbox.click();
            });
        }

        if (energy_certificate) {
            await page.click(`table#propertyTable${i} .textbluelec2 > a`);

            await page.waitForSelector(`input#certReferenceNumber${i}`);
            await page.evaluate((i) => {
                const element = document.querySelector(`input#certReferenceNumber${i}`);
                if(element) element.scrollIntoView();
            }, i);

            await page.type(`input#certReferenceNumber${i}`, energy_certificate.id);
            await page.type(`input#certIssueDate${i}`, moment(energy_certificate.created_date).format("DD/MM/YYYY"));

            // Blur
            await page.click("body");

            await page.focus(`input#certSecurityNumber${i}`);
            await page.type(`input#certSecurityNumber${i}`, energy_certificate.security_number.toString());
        }
    }
}

module.exports = { loginToAADE, fillLandlordDetails, fillTenantDetails, fillContractDetails, fillProperties };