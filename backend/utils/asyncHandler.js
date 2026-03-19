/**
 * Wraps async functions to natively bridge implicit Promise rejections to Express next() calls.
 * Allows eliminating try-catch boilerplate completely across all controller logic safely.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
