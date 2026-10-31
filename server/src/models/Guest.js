import mongoose from 'mongoose';
import { MAX_NAME_LENGTH, MAX_PHONE_LENGTH, MAX_SHORT_TEXT_LENGTH, MAX_LONG_TEXT_LENGTH } from '../utils/constants.js';

const guestSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    name: { type: String, required: true, trim: true, maxlength: MAX_NAME_LENGTH },
    email: { type: String, trim: true, lowercase: true, default: '', maxlength: MAX_SHORT_TEXT_LENGTH },
    phone: { type: String, trim: true, default: '', maxlength: MAX_PHONE_LENGTH },
    inviteToken: { type: String, sparse: true, unique: true },
    // not_sent: guest record + link exist but nothing's been shared with them yet.
    // invited: the host has actually sent/shared the link (via WhatsApp/copy).
    status: {
      type: String,
      enum: ['not_sent', 'invited', 'accepted', 'declined'],
      default: 'not_sent',
    },
    attending: { type: Boolean },
    dietaryNotes: { type: String, trim: true, default: '', maxlength: MAX_LONG_TEXT_LENGTH },
    sentAt: { type: Date },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

// Matches the host's guest-list query (filter by event, newest responses first)
// so it's served from the index without an in-memory sort.
guestSchema.index({ eventId: 1, respondedAt: -1, createdAt: -1 });

export default mongoose.model('Guest', guestSchema);
