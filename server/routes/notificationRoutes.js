import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getMyNotifications, markRead } from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', protect, getMyNotifications);

router.put('/:id/read', protect, markRead);

export default router;
