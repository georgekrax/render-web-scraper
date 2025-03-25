const express = require("express");
const { encrypt } = require("../utils/authentication");

const router = express.Router();

router.post("/get-aade-encrypted-credentials", async (req, res) => {
    const passphrase = process.env.DECRYPTION_KEY;
    const { text } = req.body;

    const encrypted = encrypt(text, passphrase);

    return res.status(200).json({ 
        data: { 
            encrypted
        }
    });
});

module.exports = router;