const express = require("express");
const { AADE_SELECTORS } = require("../utils");
const { decrypt } = require("../utils/authentication");
const { loginToAADE, fillLandlordDetails, fillTenantDetails, fillContractDetails, fillProperties } = require("../utils/aade");

const router = express.Router();

const AADE_RENT_CONTRACTS_URL = "https://www1.aade.gr/sgsisapps/plcs/protected/displayConsole.htm";

router.post("/create-aade-rent-contract", async (req, res) => {
    const { credentials: _credentials, landlords, tenants, allow_sub_lease, contract, notes, property } = req.body;

    const allowSubLease = allow_sub_lease || false;
    const credentials = {
        username: decrypt(_credentials.username),
        password: decrypt(_credentials.password)
    }

    // landlords = [
    //     { taxId: "154901702", percentage: 25, ownership: "EPICARPIA" },
    //     { taxId: "154901702", percentage: 25, ownership: "EPICARPIA" },
    //     { taxId: "154901702", percentage: 25, ownership: "EPICARPIA" },
    //     { taxId: "154901702", percentage: 25, ownership: "EPICARPIA" }
    // ];

    // tenants = [
    //     { taxId: "154901702"  }
    // ]

    // contract = {
    //     type: "COMMERCIAL",
    //     signed_date: "2025-12-16",
    //     from: "2026-01-01",
    //     to: "2026-12-21",
    //     monthly_rent: 100
    // };

    // notes = "First sentence\nSecond sentence\nThird sentence";

    // property = {
    //     type: "STORE",
    //     description: "Description",
    //     atak: "",
    //     address_name: "ΠΑΤΡΙΑΡΧΟΥ ΙΩΑΚΕΙΜ",
    //     address_number: 14,
    //     postal_code: 54629,
    //     kaek: "",
    //     area: "ΘΕΣΣΑΛΟΝΙΚΗ",
    //     district: " Θεσσαλονίκης",
    //     floor_no: 0,
    //     main_area_sq: 100,
    //     extra_area_sq: 20,
    //     elecricity_id: undefined,
    //     energy_certificate: {
    //         id: "91296",
    //         created_date: "2016-05-10",
    //         security_number: "FMMVC-605J8-K09VA-F"
    //     }
    // };

    if (!landlords) {
        return res.status(400).send({ error: { message: "`landlords` is missing from the request body" } });
    }
    if (!tenants) {
        return res.status(400).send({ error: { message: "`tenants` is missing from the request body" } });
    }
    if (!contract) {
        return res.status(400).send({ error: { message: "`contract` is missing from the request body" } });
    }
    if (!property) {
        return res.status(400).send({ error: { message: "`property` is missing from the request body" } });
    }

    
    const page = await req.browser.newPage();
    await page.goto(AADE_RENT_CONTRACTS_URL, { waitUntil: "networkidle2" });

    page.on('dialog', async dialog => {
        await dialog.accept();
    });

    await loginToAADE(page, credentials, { newURLIncludesText: AADE_SELECTORS.URL_INCLUDES.SGSISAPPS });

    await page.waitForSelector(AADE_SELECTORS.NAVIGATION.CREATE_NEW_CONTRACT_BTN, { visible: true });
    await page.click(AADE_SELECTORS.NAVIGATION.CREATE_NEW_CONTRACT_BTN);
    
    await page.waitForFunction((AADE_SELECTORS) => window.location.href.includes(AADE_SELECTORS.URL_INCLUDES.SUBMISSION_DETAILS), {}, AADE_SELECTORS);
    await page.waitForSelector(AADE_SELECTORS.NAVIGATION.CREATE_NEW_CONTRACT_BTN, { visible: true });
    await page.click(AADE_SELECTORS.NAVIGATION.CREATE_NEW_CONTRACT_BTN);
    
    await fillLandlordDetails(page, landlords);

    await fillTenantDetails(page, tenants);
    
    await fillContractDetails(page, contract, allowSubLease, notes);

    // Runs one time with possibility to extend
    await fillProperties(page, [property]);
    
    await page.click(AADE_SELECTORS.CREATE_FORM.SUBMIT_BTN);

    await page.waitForFunction((AADE_SELECTORS) => {
        const element = Array.from(document.querySelectorAll("td.textbluelec2"))[0];
        return element?.textContent.includes(AADE_SELECTORS.CREATE_FORM.TEMPORARY_SAVE_TEXT);
    }, {}, AADE_SELECTORS);

    const aadeId = await page.$eval("td.textbluelec2", el => el.textContent.match(/(\d+)/)[0]);
    
    await page.click(AADE_SELECTORS.NAVIGATION.LOGOUT_LINK);
    await page.waitForFunction(() => window.location.href.includes("login"));

    // await page.screenshot({ path: `screenshot_details_finished.png`, type: "png" });

    await page.close();

    return res.status(200).json({ 
        data: { 
            aade_id: aadeId
        }
    });
});

// router.get("/update-aade-rent-contract", async (req, res) => {
//     let { credentials, aade_contract_id, notes, from_date, to_date, monthly_rent } = req.body;

//     aade_contract_id = "74932011"

//     credentials = {
//         username: "kra2004",
//         password: "giorg04"
//     }

//     notes = "5th sentence\n6th sentence";
//     monthly_rent = 200;

//     if (!credentials) {
//         return res.status(400).send({ error: { message: "`credentials` is missing from the request body" } });
//     }
//     if (!aade_contract_id) {
//         return res.status(400).send({ error: { message: "`aade_contract_id` is missing from the request body" } });
//     }
//     if (!from_date && !to_date && !monthly_rent) {
//         return res.status(400).send({ error: { message: "You need to have either the `from_date` or `to_date` or `monthly_rent` field filled in the request body" } });
//     }

    
//     const page = await req.browser.newPage();
//     await page.goto(AADE_RENT_CONTRACTS_URL, { waitUntil: "networkidle2" });

//     page.on('console', message => console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))

//     // page.on('dialog', async dialog => {
//     //     await dialog.accept();
//     // });

//     await loginToAADE(page, credentials, { newURLIncludesText: AADE_SELECTORS.URL_INCLUDES.SGSISAPPS });

//     await page.waitForSelector(AADE_SELECTORS.NAVIGATION.CREATE_NEW_CONTRACT_BTN, { visible: true });
//     await page.click(AADE_SELECTORS.NAVIGATION.CREATE_NEW_CONTRACT_BTN);
    
//     await page.waitForFunction((AADE_SELECTORS) => window.location.href.includes(AADE_SELECTORS.URL_INCLUDES.SUBMISSION_DETAILS), {}, AADE_SELECTORS);

//     await page.evaluate((aade_contract_id) => {
//         const elementsList = Array.from(document.querySelectorAll("td[colspan='7'] td:first-child"));
//         const tableIdRow = elementsList.find(item => item.className.includes("displaySubmissionDetails") && item.textContent.startsWith(aade_contract_id.toString()));
//         console.log(tableIdRow);
//         console.log(tableIdRow?.parentElement.children);
//         // const { children } = tableIdRow?.parentElement;
//         // children[children.length - 1].querySelector("form").submit();
//     }, aade_contract_id);

//     // await page.waitForFunction(() => window.location.href.includes("gsis-flow"));

//     await page.screenshot({ path: `screenshot_details_0.png`, type: "png" });

//     // await page.waitForSelector(AADE_SELECTORS.NAVIGATION.CREATE_NEW_CONTRACT_BTN, { visible: true });
//     // await page.click(AADE_SELECTORS.NAVIGATION.CREATE_NEW_CONTRACT_BTN);
    
//     // await fillLandlordDetails(page, landlords);
    
//     // await fillContractDetails(page, contract);

//     // // Runs one time with possibility to extend
//     // await fillProperties(page, [property]);
    
//     // await page.click(AADE_SELECTORS.CREATE_FORM.SUBMIT_BTN);

//     // await page.waitForFunction(() => {
//     //     const element = Array.from(document.querySelectorAll("td.textbluelec2"))[0];
//     //     return element?.textContent.includes(AADE_SELECTORS.CREATE_FORM.TEMPORARY_SAVE_TEXT);
//     // });

//     // const aadeId = await page.$eval("td.textbluelec2", el => el.textContent.match(/(\d+)/)[0]);
    
//     await page.click(AADE_SELECTORS.NAVIGATION.LOGOUT_LINK);
//     await page.waitForFunction(() => window.location.href.includes("login"));

//     await page.screenshot({ path: `screenshot_details_3.png`, type: "png" });

//     await page.close();

//     return res.status(200).json({ 
//         data: { 
//             aade_id: aadeId
//         }
//     });
// });

module.exports = router;