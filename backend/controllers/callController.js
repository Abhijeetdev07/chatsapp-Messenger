const CallLog = require('../models/CallLog');

// @desc    Get paginated call logs for the authenticated user
// @route   GET /api/calls
// @access  Private
const getCallLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const callLogs = await CallLog.find({ participants: { $in: [req.user._id] } })
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('initiator', 'username avatar')
      .populate('participants', 'username avatar');

    const total = await CallLog.countDocuments({ participants: { $in: [req.user._id] } });

    res.json({
      success: true,
      callLogs,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('getCallLogs Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving call logs' });
  }
};

// @desc    Get a single call log by ID
// @route   GET /api/calls/:id
// @access  Private
const getCallLogById = async (req, res) => {
  try {
    const callLog = await CallLog.findById(req.params.id)
      .populate('initiator', 'username avatar')
      .populate('participants', 'username avatar');

    if (!callLog) {
      return res.status(404).json({ success: false, message: 'Call log not found' });
    }

    if (!callLog.participants.some(p => p._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this call log' });
    }

    res.json({ success: true, callLog });
  } catch (error) {
    console.error('getCallLogById Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Internal node helper used by socket.io to log call summaries gracefully
const createCallLog = async (callData) => {
  try {
    const callLog = await CallLog.create(callData);
    return callLog;
  } catch (error) {
    console.error('Internal createCallLog Error:', error);
    throw error;
  }
};

module.exports = {
  getCallLogs,
  getCallLogById,
  createCallLog
};
