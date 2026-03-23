import { validationResult } from 'express-validator';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Invitation from '../models/Invitation.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import WorkflowItem from '../models/WorkflowItem.js';
import { cacheWrap, delCacheMany } from '../utils/cache.js';

export const createProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description } = req.body;

  const project = await Project.create({
    name,
    description: description || '',
    leader: req.user._id,
    members: [req.user._id],
    tasks: [],
    progress: 0,
    deadline: null,
    completed: false,
  });

  await User.findByIdAndUpdate(req.user._id, { $addToSet: { projects: project._id } });

  await delCacheMany([`projects:${String(req.user._id)}`, `dashboard:${String(req.user._id)}`]);

  res.status(201).json(project);
};

export const getMyProjects = async (req, res) => {
  const userId = String(req.user._id);
  const key = `projects:${userId}`;

  const { value } = await cacheWrap({
    key,
    ttlSeconds: 60,
    getFresh: async () => {
      const projects = await Project.find({ members: req.user._id })
        .populate('leader', 'name email')
        .sort({ createdAt: -1 });
      return projects;
    },
  });

  res.json(value);
};

export const getProjectById = async (req, res) => {
  const { id } = req.params;

  const project = await Project.findById(id)
    .populate('leader', 'name email')
    .populate('members', 'name email');

  if (!project) return res.status(404).json({ message: 'Project not found' });

  const isMember = project.members.some((m) => String(m._id) === String(req.user._id));
  if (!isMember) return res.status(403).json({ message: 'Not a project member' });

  res.json(project);
};

export const deleteProject = async (req, res) => {
  const { id } = req.params;

  const project = await Project.findById(id);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  if (String(project.leader) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Only leader can delete project' });
  }

  await Task.deleteMany({ projectId: id });
  await Invitation.deleteMany({ projectId: id });
  await Message.deleteMany({ projectId: id });
  await Notification.deleteMany({
    $or: [
      { type: 'invitation', message: { $regex: project.name, $options: 'i' } },
      { type: 'invitation_accepted', message: { $regex: project.name, $options: 'i' } },
    ],
  });

  await Project.deleteOne({ _id: id });

  await User.updateMany({ projects: id }, { $pull: { projects: id } });

  const memberIds = (project.members || []).map((m) => String(m));
  await delCacheMany([
    ...memberIds.map((uid) => `projects:${uid}`),
    ...memberIds.map((uid) => `dashboard:${uid}`),
  ]);

  res.json({ message: 'Project deleted' });
};

export const markProjectComplete = async (req, res) => {
  const { id } = req.params;

  const project = await Project.findById(id);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  if (String(project.leader) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Only leader can complete project' });
  }

  await Project.findByIdAndUpdate(id, { progress: 100, completed: true });

  await WorkflowItem.updateMany({ projectId: id }, { $set: { completed: true } });

  await Task.updateMany({ projectId: id }, { $set: { completed: true, status: 'completed' } });

  const updated = await Project.findById(id)
    .populate('leader', 'name email')
    .populate('members', 'name email');

  const memberIds = (updated?.members || []).map((m) => String(m?._id || m));
  await delCacheMany([
    `tasks:${String(id)}`,
    ...memberIds.map((uid) => `projects:${uid}`),
    ...memberIds.map((uid) => `dashboard:${uid}`),
  ]);

  res.json(updated);
};

export const updateProjectDeadline = async (req, res) => {
  const { id } = req.params;
  const { deadline } = req.body;

  const project = await Project.findById(id);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  if (String(project.leader) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Only leader can update project deadline' });
  }

  const nextDeadline = deadline ? new Date(deadline) : null;
  if (deadline && Number.isNaN(nextDeadline.getTime())) {
    return res.status(400).json({ message: 'Invalid deadline' });
  }

  project.deadline = nextDeadline;
  await project.save();

  const updated = await Project.findById(id)
    .populate('leader', 'name email')
    .populate('members', 'name email');

  const memberIds = (updated?.members || []).map((m) => String(m?._id || m));
  await delCacheMany([
    ...memberIds.map((uid) => `projects:${uid}`),
    ...memberIds.map((uid) => `dashboard:${uid}`),
  ]);

  res.json(updated);
};
