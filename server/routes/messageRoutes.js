import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import { sendMessage, getMessagesByProject } from '../controllers/messageController.js';
import { messagesLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(messagesLimiter);

router.post(
  '/',
  protect,
  [
    body('projectId').notEmpty().withMessage('projectId is required'),
    body('message').optional().isString(),
  ],
  sendMessage
);

router.get('/:projectId', protect, getMessagesByProject);

export default router;
