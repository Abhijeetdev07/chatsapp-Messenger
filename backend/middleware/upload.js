const multer = require('multer');

// Configure memory storage
const storage = multer.memoryStorage();

// File filter based on type
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    // Video
    'video/mp4', 'video/webm',
    // Audio
    'audio/mpeg', 'audio/ogg', 'audio/wav',
    // Documents
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};

// Define global size limits across all files (Type specific validation handles tighter limits later)
const limits = {
  fileSize: 100 * 1024 * 1024, // 100MB 
};

const upload = multer({
  storage,
  fileFilter,
  limits,
});

module.exports = upload;
