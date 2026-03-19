const jwt = require('jsonwebtoken');

/**
 * Generates an Access Token with a short lifespan (15 minutes).
 * @param {string} userId
 * @returns {string} JWT Access Token
 */
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m',
  });
};

/**
 * Generates a Refresh Token with a longer lifespan (7 days).
 * @param {string} userId
 * @returns {string} JWT Refresh Token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
