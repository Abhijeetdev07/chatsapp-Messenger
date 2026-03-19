const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables IMMEDIATELY to populate process.env for all subsequent required modules
dotenv.config();

const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const callRoutes = require('./routes/callRoutes');
const { initSocket } = require('./socket/socketManager');

// Initialize Express app and HTTP server wrapper
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO instance attached securely to the HTTP server wrapper
initSocket(server);

// Middleware
app.use(express.json()); // Parses incoming JSON requests
app.use(cookieParser()); // Parses HTTP-only cookies
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
})); // Enables CORS

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
})); 

// General API Rate Limiting across all of /api logic
app.use('/api', apiLimiter);

app.use(morgan('dev')); // Logs HTTP requests

// Mount route groups
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/calls', callRoutes);

app.get('/', (req, res) => {
  res.send('ChatUp API Server is running');
});

// Centralized Error Handling Pipeline
app.use(errorHandler);

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('Warning: MONGODB_URI is not defined in environment variables');
    } else {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB connected successfully');
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Start the HTTP server wrapper instead of Express app directly
const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  await connectDB();
  console.log(`Server is running on port ${PORT}`);
});
