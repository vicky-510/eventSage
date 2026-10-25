import 'dotenv/config';
import { createApp } from './app.js';
import { connectDB } from './db.js';

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB(process.env.MONGO_URI);
  const app = createApp();
  app.listen(PORT, () => console.log(`EventSage server listening on port ${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
