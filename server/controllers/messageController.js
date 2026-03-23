import { validationResult } from 'express-validator';
import Message from '../models/Message.js';
import Project from '../models/Project.js';

export const sendMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { projectId, message, attachments } = req.body;

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const isMember = project.members.some((m) => String(m) === String(req.user._id));
  if (!isMember) return res.status(403).json({ message: 'Not a project member' });

  const hasText = Boolean(message && String(message).trim());
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  if (!hasText && !hasAttachments) {
    return res.status(400).json({ message: 'message is required' });
  }

  const msg = await Message.create({
    projectId,
    sender: req.user._id,
    message: hasText ? String(message).trim() : '[attachment]',
    attachments: hasAttachments ? attachments : [],
  });

  const populated = await Message.findById(msg._id).populate('sender', 'name email');

  res.status(201).json(populated);
};

export const getMessagesByProject = async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const isMember = project.members.some((m) => String(m) === String(req.user._id));
  if (!isMember) return res.status(403).json({ message: 'Not a project member' });

  const messages = await Message.find({ projectId })
    .populate('sender', 'name email')
    .sort({ createdAt: 1 });

  res.json(messages);
};
