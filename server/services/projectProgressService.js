import Project from '../models/Project.js';
import Task from '../models/Task.js';

export const recalcProjectProgress = async (projectId) => {
  // Phase 1 decision: project progress is manually set by the project leader.
  // We keep this function to preserve call sites and allow future switch back
  // to auto-calculation if needed.
  const project = await Project.findById(projectId).select('progress');
  return project?.progress ?? 0;
};
