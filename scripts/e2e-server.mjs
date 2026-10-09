import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../server/dist/app.js';
import { initializeSocket } from '../server/dist/sockets/task.socket.js';
if (process.env.NODE_ENV !== 'test') throw new Error('Browser fixture requires NODE_ENV=test');
const mongo = await MongoMemoryServer.create({ binary: { downloadDir: join(tmpdir(), 'taskflow-test-mongodb') } });
await mongoose.connect(mongo.getUri());
await Promise.all(Object.values(mongoose.models).map(model => model.init()));
const server = createServer(app);
const io = initializeSocket(server);
app.locals.io = io;
server.listen(5100, '127.0.0.1');
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  await new Promise(resolve => io.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
