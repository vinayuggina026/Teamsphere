import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import {
  createProject,
  getMyProjects,
  getProjectById,
  deleteProject,
  markProjectComplete,
  updateProjectDeadline,
} from '../controllers/projectController.js';

const router = express.Router();

router.post(
  '/',
  protect,
  [body('name').trim().notEmpty().withMessage('name is required')],
  createProject
);

router.get('/', protect, getMyProjects);

router.get('/:id', protect, getProjectById);

router.put('/:id/complete', protect, markProjectComplete);

router.put('/:id/deadline', protect, updateProjectDeadline);

router.delete('/:id', protect, deleteProject);

export default router;
