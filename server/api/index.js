import 'dotenv/config';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/db.js';

let connected = false;
const app = createApp();

export default async function handler(req, res) {
  if (!connected) {
    await connectDB(process.env.MONGO_URI);
    connected = true;
  }
  return app(req, res);
}
