const { validationResult } = require('express-validator');

/**
 * Middleware that intercepts requests post-validation layer 
 * and aborts with a 400 array response if input validation failed.
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

module.exports = validateRequest;
