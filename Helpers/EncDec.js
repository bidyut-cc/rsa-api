const crypto = require('crypto');

// Encryption and decryption keys should be kept secret
const algorithm = 'aes-256-cbc';
let secretKey = process.env.ENCRYPT_KEY; // Should be 32 characters for aes-256
if (secretKey.length < 32) {
  // Pad the key if it's shorter than 32 bytes
  secretKey = secretKey.padEnd(32, '0'); // Pad with '0' if necessary
} else if (secretKey.length > 32) {
  // Alternatively, hash the key to get exactly 32 bytes
  secretKey = crypto.createHash('sha256').update(secretKey).digest('base64').substr(0, 32);
}
const iv = crypto.randomBytes(16); // Initialization vector for encryption

// Encrypt the token
function encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

// Decrypt the token
function decrypt(encryptedText) {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encrypted = parts.join(':');
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
