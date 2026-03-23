import Notification from '../models/Notification.js';

export const getMyNotifications = async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  res.json(notifications);
};

export const markRead = async (req, res) => {
  const { id } = req.params;

  const notif = await Notification.findById(id);
  if (!notif) return res.status(404).json({ message: 'Notification not found' });

  if (String(notif.userId) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Not allowed' });
  }

  notif.read = true;
  await notif.save();

  res.json(notif);
};
