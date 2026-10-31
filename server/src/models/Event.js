import mongoose from 'mongoose';
import crypto from 'crypto';
import {
  MAX_TITLE_LENGTH,
  MAX_SHORT_TEXT_LENGTH,
  MAX_LONG_TEXT_LENGTH,
  MAX_ASSISTANT_REPLY_LENGTH,
} from '../utils/constants.js';

const budgetItemSchema = new mongoose.Schema(
  { category: String, amount: { type: Number, min: 0 }, spent: { type: Number, default: 0, min: 0 } },
  { _id: false }
);

const timelineItemSchema = new mongoose.Schema({ label: String, time: String, notes: String }, { _id: false });

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
    content: { type: String, required: true, maxlength: MAX_ASSISTANT_REPLY_LENGTH },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

const eventSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    publicId: { type: String, unique: true, default: () => crypto.randomBytes(8).toString('hex') },
    title: { type: String, required: true, trim: true, maxlength: MAX_TITLE_LENGTH },
    occasionType: { type: String, trim: true, maxlength: MAX_SHORT_TEXT_LENGTH },
    date: Date,
    location: { type: String, trim: true, maxlength: MAX_SHORT_TEXT_LENGTH },
    guestCount: { type: Number, min: 0 },
    budgetTotal: { type: Number, min: 0 },
    vibe: { type: String, trim: true, maxlength: MAX_LONG_TEXT_LENGTH },
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

// Serves the dashboard query (a user's events, newest first) straight from the
// index, sort included; also covers plain ownerId lookups as its prefix.
eventSchema.index({ ownerId: 1, createdAt: -1 });

export default mongoose.model('Event', eventSchema);
