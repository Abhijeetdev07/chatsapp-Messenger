const express = require('express');
const router = express.Router();
const { getCallLogs, getCallLogById } = require('../controllers/callController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getCallLogs);

router.route('/:id')
  .get(getCallLogById);

module.exports = router;
