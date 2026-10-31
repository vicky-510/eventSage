import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    // select:false keeps secrets out of every query result unless a route opts
    // in explicitly with .select('+field'), so they can't leak by accident.
    passwordHash: { type: String, required: true, select: false },
    refreshTokenHash: { type: String, default: null, select: false },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
