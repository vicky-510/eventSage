import 'dotenv/config';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/db.js';
import { assertRequiredEnv } from '../src/utils/env.js';

assertRequiredEnv();
const app = createApp();

export default async function handler(req, res) {
  await connectDB(process.env.MONGO_URI);
  return app(req, res);
}
