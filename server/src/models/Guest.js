import mongoose from 'mongoose';

const guestSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    inviteToken: { type: String, index: true, sparse: true, unique: true },
    status: {
      type: String,
      enum: ['invited', 'accepted', 'declined'],
      default: 'invited',
    },
    attending: { type: Boolean },
    dietaryNotes: { type: String, trim: true, default: '' },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('Guest', guestSchema);
