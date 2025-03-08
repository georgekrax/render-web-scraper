const cron = require("cron");
const https = require("https");

const BACKEND_URL = "https://render-web-scraper.onrender.com/api/keep-alive";

const job = new cron.CronJob("*/14 * * * *", () => {
    console.log("Restarting server");

    https
        .get(BACKEND_URL, (res) => {
            if (res.statusCode != 200) {
                console.error(`Failed to restart server with status code: ${res.statusCode}`);
            }
        })
        .on("error", (err) => {
            console.error("Error pinging API:", err.message);
        });

});

module.exports = { 
    job
};