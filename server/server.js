import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import { connectDB } from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import invitationRoutes from './routes/invitationRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import workflowRoutes from './routes/workflowRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

import { initRedis, getRedisStatus } from './config/redis.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || '*',
    credentials: true,
  })
);

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'teamsphere-server', redis: getRedisStatus() });
});

app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/invitations', invitationRoutes);
app.use('/tasks', taskRoutes);
app.use('/messages', messageRoutes);
app.use('/notifications', notificationRoutes);
app.use('/uploads-api', uploadRoutes);
app.use('/workflows', workflowRoutes);
app.use('/dashboard', dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    initRedis();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
