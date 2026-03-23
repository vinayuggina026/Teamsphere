import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import {
  createTask,
  bulkAssignTask,
  getTasksByProject,
  getMyAssignedTasks,
  getTaskById,
  submitTaskReport,
  updateTask,
  deleteTask,
} from '../controllers/taskController.js';

const router = express.Router();

router.post(
  '/',
  protect,
  [
    body('title').trim().notEmpty().withMessage('title is required'),
    body('assignedTo').notEmpty().withMessage('assignedTo is required'),
    body('projectId').notEmpty().withMessage('projectId is required'),
  ],
  createTask
);

router.post(
  '/bulk',
  protect,
  [
    body('title').trim().notEmpty().withMessage('title is required'),
    body('projectId').notEmpty().withMessage('projectId is required'),
  ],
  bulkAssignTask
);

router.get('/project/:id', protect, getTasksByProject);

router.get('/assigned/me', protect, getMyAssignedTasks);

router.get('/:id', protect, getTaskById);

router.post('/:id/report', protect, submitTaskReport);

router.put('/:id', protect, updateTask);

router.delete('/:id', protect, deleteTask);

export default router;
