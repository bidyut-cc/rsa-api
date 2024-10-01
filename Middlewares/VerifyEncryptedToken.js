const { decrypt } = require("../Helpers/EncDec");

// Middleware to check the token
const VerifyEncryptedToken = (req, res, next) => {
  const token = req.headers["token"]; // The token from request headers
  if (!token) {
    return res.status(403).json({ status: false, message: "No token provided!" });
  }

  try {
    // Decrypt the token received from the client
    const decryptedToken = decrypt(token, process.env.ENCRYPT_KEY);
    
    // Set of valid static tokens
    const validTokens = [
      "RSA-API-V1-rV2c1Cd*6YM@", 
      "RSA-API-V1-]£1gHB5;7L)B",
      "RSA-API-V1-52f_ncLD1oo6",
      "RSA-API-V1-C:35Bxz£L82O",
      "RSA-API-V1-Ut|)1JF2808H",
      "RSA-API-V1-dUVG-I9X'2)9",
      "RSA-API-V1-41eX3vX\%/uP",
      "RSA-API-V1-3g33-pDq%vxU",
      "RSA-API-V1-)7xet>6vP934",
      "RSA-API-V1-43O6hqf::D?U"
    ];

    // Check if the decrypted token is in the validTokens list
    if (!validTokens.includes(decryptedToken)) {
      return res.status(401).json({ status: false, message: "Invalid token!" });
    }

    // If the token is valid, proceed to the next middleware or route handler
    next();
    
  } catch (err) {
    return res.status(401).json({ status: false, message: "Invalid token format!" });
  }
};

module.exports = VerifyEncryptedToken;
