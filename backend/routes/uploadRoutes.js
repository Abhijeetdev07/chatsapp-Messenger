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
    let resourceType = 'auto';

    // Type-specific size enforcement
    if (mimetype.startsWith('image/')) {
      if (size > 10 * 1024 * 1024) return res.status(400).json({ success: false, message: 'Image exceeds 10MB limit.' });
      resourceType = 'image';
    } else if (mimetype.startsWith('video/')) {
      if (size > 100 * 1024 * 1024) return res.status(400).json({ success: false, message: 'Video exceeds 100MB limit.' });
      resourceType = 'video';
    } else if (mimetype.startsWith('audio/')) {
      if (size > 50 * 1024 * 1024) return res.status(400).json({ success: false, message: 'Audio exceeds 50MB limit.' });
      resourceType = 'video'; // In Cloudinary, audio is processed as video
    } else {
      if (size > 50 * 1024 * 1024) return res.status(400).json({ success: false, message: 'File exceeds 50MB limit.' });
      resourceType = 'raw';
    }

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
