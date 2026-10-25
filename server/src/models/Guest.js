import mongoose from 'mongoose';

const guestSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    name: { type: String, required: true, trim: true },
    attending: { type: Boolean, required: true },
    dietaryNotes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Guest', guestSchema);
