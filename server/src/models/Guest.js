import mongoose from 'mongoose';

const guestSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    inviteToken: { type: String, index: true, sparse: true, unique: true },
    // not_sent: guest record + link exist but nothing's been shared with them yet.
    // invited: the host has actually sent/shared the link (via WhatsApp/copy).
    status: {
      type: String,
      enum: ['not_sent', 'invited', 'accepted', 'declined'],
      default: 'not_sent',
    },
    attending: { type: Boolean },
    dietaryNotes: { type: String, trim: true, default: '' },
    sentAt: { type: Date },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('Guest', guestSchema);
