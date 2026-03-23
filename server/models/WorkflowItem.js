import mongoose from 'mongoose';

const workflowItemSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    completed: { type: Boolean, default: false },
    dueDate: { type: Date, default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('WorkflowItem', workflowItemSchema);
