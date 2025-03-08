const express = require("express");

const router = express.Router();

router.get("/keep-alive", (req, res) => {
    res.status(200).json({ 
        data: { message: "I'm awake!" }
    });;
});

module.exports = router;