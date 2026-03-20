const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/authMiddleware');
const { uploadToCloudinary } = require('../config/cloudinary');
const { uploadLimiter } = require('../middleware/rateLimiter');

router.use(uploadLimiter);

// @desc    Upload a single file to Cloudinary
// @route   POST /api/upload
// @access  Private
router.post('/', protect, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const { mimetype, size, buffer } = req.file;

    // Only allow voice-note audio uploads
    if (!mimetype.startsWith('audio/')) {
      return res.status(400).json({ success: false, message: 'Only audio uploads are supported' });
    }

    if (size > 50 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Audio exceeds 50MB limit.' });
    }

    // In Cloudinary, audio is processed as video
    const resourceType = 'video';

    // Attempt upload buffer to Cloudinary
    const result = await uploadToCloudinary(buffer, 'chatup_uploads', resourceType);

    res.status(200).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
    });
  } catch (error) {
    console.error('Upload Route Error:', error);
    res.status(500).json({ success: false, message: 'Cloudinary upload failed' });
  }
});

module.exports = router;
