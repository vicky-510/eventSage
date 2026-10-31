import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import Event from '../src/models/Event.js';
import { signAccessToken, signRefreshToken, hashToken } from '../src/utils/tokens.js';

export const TEST_PASSWORD = 'SuperSecret1';

/**
 * Creates a user directly in the DB with a live session, bypassing the
 * rate-limited signup route so tests can create as many users as they need.
 */
export async function createUser(email = 'owner@example.com') {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4);
  const user = await User.create({ email, passwordHash });
  const refreshToken = signRefreshToken(user._id.toString());
  await User.updateOne({ _id: user._id }, { refreshTokenHash: hashToken(refreshToken) });
  return { user, token: signAccessToken(user._id.toString()), refreshToken };
}

export function createEvent(ownerId, overrides = {}) {
  return Event.create({ ownerId, title: 'Birthday Bash', budgetTotal: 50000, ...overrides });
}

export function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}
