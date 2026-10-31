import mongoose from 'mongoose';

let connection = null;

/**
 * Connects once per process and reuses that promise afterwards. Serverless
 * instances handle many requests per cold start, so concurrent first requests
 * share one connection attempt instead of racing to open several.
 * @param {string} uri
 */
export function connectDB(uri) {
  if (!connection) {
    mongoose.set('strictQuery', true);
    connection = mongoose
      .connect(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 })
      .then(() => mongoose.connection)
      .catch((err) => {
        connection = null; // let the next request retry instead of caching the failure
        throw err;
      });
  }
  return connection;
}
