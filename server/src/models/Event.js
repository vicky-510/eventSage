import mongoose from 'mongoose';
import crypto from 'crypto';

const budgetItemSchema = new mongoose.Schema(
  { category: String, amount: Number, spent: { type: Number, default: 0 } },
  { _id: false }
);

const timelineItemSchema = new mongoose.Schema(
  { label: String, time: String, notes: String },
  { _id: false }
);

const checklistItemSchema = new mongoose.Schema(
  {
    task: String,
    dueDate: Date,
    status: { type: String, enum: ['todo', 'booked', 'paid'], default: 'todo' },
  },
  { _id: false }
);

const moodboardSchema = new mongoose.Schema(
  { themeName: String, colors: { type: [String], default: [] }, description: String },
  { _id: false }
);

const insightSchema = new mongoose.Schema(
  {
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    message: String,
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

const eventSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    publicId: { type: String, unique: true, default: () => crypto.randomBytes(8).toString('hex') },
    title: { type: String, required: true, trim: true },
    occasionType: { type: String, trim: true },
    date: Date,
    location: { type: String, trim: true },
    guestCount: Number,
    budgetTotal: Number,
    vibe: { type: String, trim: true },
    plan: {
      budget: { type: [budgetItemSchema], default: [] },
      timeline: { type: [timelineItemSchema], default: [] },
      checklist: { type: [checklistItemSchema], default: [] },
      ideas: { type: [String], default: [] },
      moodboard: { type: moodboardSchema, default: null },
      insights: { type: [insightSchema], default: [] },
    },
    assistantChat: { type: [chatMessageSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('Event', eventSchema);
