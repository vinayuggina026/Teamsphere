import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    status: { type: String, enum: ['todo', 'completed'], default: 'todo' },
    completed: { type: Boolean, default: false },
    dueDate: { type: Date, default: null },
    report: {
      text: { type: String, default: '' },
      submittedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Task', taskSchema);
