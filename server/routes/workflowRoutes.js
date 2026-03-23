import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import {
  listWorkflowItems,
  createWorkflowItem,
  updateWorkflowItem,
  toggleWorkflowItem,
  deleteWorkflowItem,
} from '../controllers/workflowController.js';

const router = express.Router();

router.get('/project/:projectId', protect, listWorkflowItems);

router.post(
  '/',
  protect,
  [
    body('projectId').notEmpty().withMessage('projectId is required'),
    body('title').trim().notEmpty().withMessage('title is required'),
  ],
  createWorkflowItem
);

router.put('/:id', protect, updateWorkflowItem);

router.put('/:id/toggle', protect, toggleWorkflowItem);

router.delete('/:id', protect, deleteWorkflowItem);

export default router;
