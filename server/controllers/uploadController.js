import Project from '../models/Project.js';

export const uploadProjectFile = async (req, res) => {
  const { projectId } = req.body;

  if (!projectId) return res.status(400).json({ message: 'projectId is required' });
  if (!req.file) return res.status(400).json({ message: 'file is required' });

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const isMember = project.members.some((m) => String(m) === String(req.user._id));
  if (!isMember) return res.status(403).json({ message: 'Not a project member' });

  const url = `/uploads/${req.file.filename}`;

  res.status(201).json({
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url,
  });
};
