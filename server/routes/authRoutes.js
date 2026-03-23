import express from 'express';
import { body } from 'express-validator';
import { register, login, me } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('name is required'),
    body('email').isEmail().withMessage('valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('password must be at least 6 chars'),
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('valid email is required'),
    body('password').notEmpty().withMessage('password is required'),
  ],
  login
);

router.get('/me', protect, me);

export default router;
