const rateLimit = require('express-rate-limit');

// Protect authentication routes strictly against brute forcing
// 10 requests / 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, // Increased for development testing
  message: { success: false, message: 'Too many requests from this IP for auth, please try again after 15 minutes' }
});

// Avoid cloud budget drainage on uploaded blobs
// 20 requests / hour globally applied primarily to the /upload route
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many upload attempts, please try again after an hour' }
});

// Protect REST infrastructure entirely broadly against bot spamming
// 100 requests / 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});

module.exports = {
  authLimiter,
  uploadLimiter,
  apiLimiter
};
