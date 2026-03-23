import { validationResult } from 'express-validator';
import Invitation from '../models/Invitation.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

export const sendInvitation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { projectId, receiverEmail } = req.body;

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  if (String(project.leader) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Only leader can invite members' });
  }

  const receiver = await User.findOne({ email: receiverEmail.toLowerCase().trim() });
  if (!receiver) return res.status(404).json({ message: 'Receiver not found' });

  const isAlreadyMember = project.members.some((m) => String(m) === String(receiver._id));
  if (isAlreadyMember) return res.status(400).json({ message: 'User already a member' });

  const existing = await Invitation.findOne({ projectId, receiver: receiver._id, status: 'pending' });
  if (existing) return res.status(400).json({ message: 'Invitation already pending' });

  const invitation = await Invitation.create({
    projectId,
    sender: req.user._id,
    receiver: receiver._id,
    status: 'pending',
  });

  await Notification.create({
    userId: receiver._id,
    type: 'invitation',
    message: `You have been invited to project: ${project.name}`,
  });

  res.status(201).json(invitation);
};

export const getMyInvitations = async (req, res) => {
  const invitations = await Invitation.find({ receiver: req.user._id, status: 'pending' })
    .populate('projectId', 'name description')
    .populate('sender', 'name email')
    .sort({ createdAt: -1 });

  res.json(invitations);
};

export const respondToInvitation = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // accepted | rejected

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const invitation = await Invitation.findById(id);
  if (!invitation) return res.status(404).json({ message: 'Invitation not found' });

  if (String(invitation.receiver) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Not allowed' });
  }

  if (invitation.status !== 'pending') {
    return res.status(400).json({ message: 'Invitation already responded' });
  }

  invitation.status = status;
  await invitation.save();

  if (status === 'accepted') {
    await Project.findByIdAndUpdate(invitation.projectId, {
      $addToSet: { members: req.user._id },
    });

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { projects: invitation.projectId },
    });

    const project = await Project.findById(invitation.projectId);
    await Notification.create({
      userId: invitation.sender,
      type: 'invitation_accepted',
      message: `${req.user.name} accepted your invitation to ${project?.name || 'project'}`,
    });
  }

  res.json(invitation);
};
