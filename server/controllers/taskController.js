import { validationResult } from 'express-validator';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Notification from '../models/Notification.js';

export const createTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, assignedTo, projectId, dueDate } = req.body;

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  if (String(project.leader) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Only leader can create tasks' });
  }

  const isMember = project.members.some((m) => String(m) === String(assignedTo));
  if (!isMember) {
    return res.status(400).json({ message: 'Assignee must be a project member' });
  }

  const task = await Task.create({
    title,
    description: description || '',
    assignedTo,
    projectId,
    status: 'todo',
    completed: false,
    dueDate: dueDate ? new Date(dueDate) : null,
  });

  await Project.findByIdAndUpdate(projectId, { $addToSet: { tasks: task._id } });

  await Notification.create({
    userId: assignedTo,
    type: 'task_assigned',
    message: `You were assigned a task: ${title}`,
  });

  res.status(201).json(task);
};

export const bulkAssignTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, projectId, dueDate } = req.body;

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  if (String(project.leader) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Only leader can bulk assign tasks' });
  }

  const memberIds = (project.members || [])
    .map((m) => String(m))
    .filter((m) => m !== String(project.leader));

  if (memberIds.length === 0) {
    return res.status(400).json({ message: 'No members to assign (excluding leader)' });
  }

  const createdTasks = await Task.insertMany(
    memberIds.map((memberId) => ({
      title,
      description: description || '',
      assignedTo: memberId,
      projectId,
      status: 'todo',
      completed: false,
      dueDate: dueDate ? new Date(dueDate) : null,
    }))
  );

  const createdTaskIds = createdTasks.map((t) => t._id);
  await Project.findByIdAndUpdate(projectId, { $addToSet: { tasks: { $each: createdTaskIds } } });

  await Notification.insertMany(
    memberIds.map((memberId) => ({
      userId: memberId,
      type: 'task_assigned',
      message: `You were assigned a task: ${title}`,
    }))
  );

  res.status(201).json({ count: createdTasks.length, tasks: createdTasks });
};

export const getTasksByProject = async (req, res) => {
  const { id } = req.params;

  const project = await Project.findById(id);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const isMember = project.members.some((m) => String(m) === String(req.user._id));
  if (!isMember) return res.status(403).json({ message: 'Not a project member' });

  const tasks = await Task.find({ projectId: id })
    .populate('assignedTo', 'name email')
    .sort({ createdAt: -1 });

  res.json(tasks);
};

export const getMyAssignedTasks = async (req, res) => {
  const tasks = await Task.find({ assignedTo: req.user._id })
    .populate('projectId', 'name progress')
    .sort({ createdAt: -1 })
    .limit(50);

  res.json(tasks);
};

export const updateTask = async (req, res) => {
  const { id } = req.params;
  const { completed, status, dueDate } = req.body;

  const task = await Task.findById(id);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const project = await Project.findById(task.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const isLeader = String(project.leader) === String(req.user._id);
  const isAssignee = String(task.assignedTo) === String(req.user._id);

  if (!isLeader && !isAssignee) {
    return res.status(403).json({ message: 'Not allowed' });
  }

  const hasCompletionChange = typeof completed === 'boolean' || status === 'completed' || status === 'todo';
  const nextCompleted =
    typeof completed === 'boolean'
      ? completed
      : status === 'completed'
        ? true
        : status === 'todo'
          ? false
          : undefined;

  if (hasCompletionChange) {
    if (nextCompleted === undefined) {
      return res
        .status(400)
        .json({ message: 'completed(boolean) or status(todo/completed) is required when updating completion' });
    }
    task.completed = nextCompleted;
    task.status = nextCompleted ? 'completed' : 'todo';
  }

  if (dueDate !== undefined) {
    if (!isLeader) return res.status(403).json({ message: 'Only leader can change due date' });
    task.dueDate = dueDate ? new Date(dueDate) : null;
  }

  if (!hasCompletionChange && dueDate === undefined) {
    return res.status(400).json({ message: 'No updatable fields provided' });
  }

  await task.save();

  res.json(task);
};

export const getTaskById = async (req, res) => {
  const { id } = req.params;

  const task = await Task.findById(id).populate('assignedTo', 'name email');
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const project = await Project.findById(task.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const isMember = project.members.some((m) => String(m) === String(req.user._id));
  if (!isMember) return res.status(403).json({ message: 'Not a project member' });

  res.json(task);
};

export const submitTaskReport = async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  const task = await Task.findById(id);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  if (String(task.assignedTo) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Only assignee can submit report' });
  }

  if (task.completed) {
    return res.status(400).json({ message: 'Task is already completed' });
  }

  if (!task.dueDate) {
    return res.status(400).json({ message: 'Task has no due date' });
  }

  const overdue = new Date(task.dueDate).getTime() < Date.now();
  if (!overdue) {
    return res.status(400).json({ message: 'Task is not overdue yet' });
  }

  task.report = {
    text: String(text || '').trim(),
    submittedAt: new Date(),
  };

  await task.save();
  res.json(task);
};

export const deleteTask = async (req, res) => {
  const { id } = req.params;

  const task = await Task.findById(id);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const project = await Project.findById(task.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  if (String(project.leader) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Only leader can delete tasks' });
  }

  await Task.deleteOne({ _id: id });
  await Project.findByIdAndUpdate(task.projectId, { $pull: { tasks: id } });

  res.json({ message: 'Task deleted' });
};
