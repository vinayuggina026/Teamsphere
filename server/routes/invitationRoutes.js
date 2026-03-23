import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import {
  sendInvitation,
  getMyInvitations,
  respondToInvitation,
} from '../controllers/invitationController.js';

const router = express.Router();

router.post(
  '/',
  protect,
  [
    body('projectId').notEmpty().withMessage('projectId is required'),
    body('receiverEmail').isEmail().withMessage('valid receiverEmail is required'),
  ],
  sendInvitation
);

router.get('/', protect, getMyInvitations);

router.put('/:id', protect, respondToInvitation);

export default router;
