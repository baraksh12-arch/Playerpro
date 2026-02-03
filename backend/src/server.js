import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import lessonRoutes from './routes/lessons.js';
import recordingRoutes from './routes/recordings.js';
import practiceRoutes from './routes/practice.js';
import materialRoutes from './routes/materials.js';
import recommendationRoutes from './routes/recommendations.js';
import chatRoutes from './routes/chat.js';
import announcementRoutes from './routes/announcements.js';
import teacherRoutes from './routes/teacher.js';
import managementRoutes from './routes/management.js';
import functionRoutes from './routes/functions.js';
import uploadRoutes from './routes/upload.js';
import teacherSerialsRoutes from './routes/teacher-serials.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/management', managementRoutes);
app.use('/api/functions', functionRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/management/teacher-serials', teacherSerialsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
