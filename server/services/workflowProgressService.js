import Project from '../models/Project.js';
import WorkflowItem from '../models/WorkflowItem.js';

export const recalcWorkflowProgress = async (projectId) => {
  const project = await Project.findById(projectId).select('completed');
  if (!project) return 0;

  const total = await WorkflowItem.countDocuments({ projectId });
  if (total === 0) {
    await Project.findByIdAndUpdate(projectId, { progress: 0 });
    return 0;
  }

  const completed = await WorkflowItem.countDocuments({ projectId, completed: true });
  const raw = Math.round((completed / total) * 100);
  const progress = project.completed ? raw : Math.min(raw, 99);
  await Project.findByIdAndUpdate(projectId, { progress });
  return progress;
};
