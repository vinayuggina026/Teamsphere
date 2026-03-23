import { validationResult } from 'express-validator';
import Project from '../models/Project.js';
import WorkflowItem from '../models/WorkflowItem.js';
import { recalcWorkflowProgress } from '../services/workflowProgressService.js';

export const listWorkflowItems = async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const isMember = project.members.some((m) => String(m) === String(req.user._id));
  if (!isMember) return res.status(403).json({ message: 'Not a project member' });

  const items = await WorkflowItem.find({ projectId }).sort({ order: 1, createdAt: 1 });
  res.json(items);
};

export const createWorkflowItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { projectId, title, description, dueDate } = req.body;

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  if (String(project.leader) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Only leader can manage workflow' });
  }

  const last = await WorkflowItem.find({ projectId }).sort({ order: -1 }).limit(1);
  const nextOrder = last.length ? (last[0].order || 0) + 1 : 1;

  const item = await WorkflowItem.create({
    projectId,
    title,
    description: description || '',
    completed: false,
    dueDate: dueDate ? new Date(dueDate) : null,
    order: nextOrder,
  });

  await recalcWorkflowProgress(projectId);

  res.status(201).json(item);
};

export const updateWorkflowItem = async (req, res) => {
  const { id } = req.params;
  const { title, description, dueDate } = req.body;

  const item = await WorkflowItem.findById(id);
  if (!item) return res.status(404).json({ message: 'Workflow item not found' });

  const project = await Project.findById(item.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  if (String(project.leader) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Only leader can manage workflow' });
  }

  if (typeof title === 'string') item.title = title;
  if (typeof description === 'string') item.description = description;
  if (dueDate !== undefined) item.dueDate = dueDate ? new Date(dueDate) : null;

  await item.save();
  res.json(item);
};

export const toggleWorkflowItem = async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;

  if (typeof completed !== 'boolean') {
    return res.status(400).json({ message: 'completed(boolean) is required' });
  }

  const item = await WorkflowItem.findById(id);
  if (!item) return res.status(404).json({ message: 'Workflow item not found' });

  const project = await Project.findById(item.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  if (String(project.leader) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Only leader can manage workflow' });
  }

  item.completed = completed;
  await item.save();

  await recalcWorkflowProgress(item.projectId);

  res.json(item);
};

export const deleteWorkflowItem = async (req, res) => {
  const { id } = req.params;

  const item = await WorkflowItem.findById(id);
  if (!item) return res.status(404).json({ message: 'Workflow item not found' });

  const project = await Project.findById(item.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  if (String(project.leader) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Only leader can manage workflow' });
  }

  await WorkflowItem.deleteOne({ _id: id });
  await recalcWorkflowProgress(item.projectId);

  res.json({ message: 'Workflow item deleted' });
};
