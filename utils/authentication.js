const crypto = require("crypto");

// Secure parameters
const PBKDF2_ITERATIONS = 100000; // 100k iterations for strong key derivation
const KEY_LENGTH = 32; // 256-bit key
const SALT_LENGTH = 16; // 16 bytes of salt
const IV_LENGTH = 12; // AES-GCM requires 12-byte IV

/**
 * Derive a 256-bit encryption key from a passphrase using PBKDF2.
 * @param {string} passphrase - The secret passphrase.
 * @param {Buffer} salt - A unique salt for key derivation.
 * @returns {Buffer} 32-byte encryption key.
 */
const deriveKey = (passphrase, salt) => {
    return crypto.pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha256");
};

/**
 * Encrypts text using AES-256-GCM and PBKDF2-derived key.
 * @param {string} text - The plaintext to encrypt.
 * @param {string} passphrase - The secret passphrase.
 * @returns {string} Encrypted data in base64 format.
 */
const encrypt = (text, passphrase) => {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKey(passphrase, salt);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return Buffer.from(salt.toString("hex") + ":" + iv.toString("hex") + ":" + encrypted + ":" + authTag).toString("base64");
};

/**
 * Decrypts an AES-256-GCM encrypted string using PBKDF2-derived key.
 * @param {string} encryptedData - The base64 encrypted data.
 * @param {string} passphrase - The secret passphrase.
 * @returns {string} The decrypted plaintext.
 */
const decrypt = (encryptedData, passphrase) => {
    const decoded = Buffer.from(encryptedData, "base64").toString();
    const [saltHex, ivHex, encryptedHex, authTagHex] = decoded.split(":");

    const salt = Buffer.from(saltHex, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const key = deriveKey(passphrase, salt);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
};

module.exports = { encrypt, decrypt };
