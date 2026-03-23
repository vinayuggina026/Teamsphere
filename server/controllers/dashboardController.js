import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Invitation from '../models/Invitation.js';
import Notification from '../models/Notification.js';
import { cacheWrap } from '../utils/cache.js';

export const getDashboard = async (req, res) => {
  const userId = String(req.user._id);
  const key = `dashboard:${userId}`;

  const { value } = await cacheWrap({
    key,
    ttlSeconds: 30,
    getFresh: async () => {
      const [projects, tasks, invitations, notifications] = await Promise.all([
        Project.find({ members: req.user._id })
          .populate('leader', 'name email')
          .populate('members', 'name email')
          .sort({ createdAt: -1 }),
        Task.find({ assignedTo: req.user._id })
          .populate('projectId', 'name progress')
          .sort({ createdAt: -1 })
          .limit(50),
        Invitation.find({ receiver: req.user._id, status: 'pending' })
          .populate('projectId', 'name description')
          .populate('sender', 'name email')
          .sort({ createdAt: -1 }),
        Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50),
      ]);

      return { projects, tasks, invitations, notifications };
    },
  });

  res.json(value);
};
