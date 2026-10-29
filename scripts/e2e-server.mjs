import { createServer } from 'node:http';
import express from 'express';
import { ipKeyGenerator } from 'express-rate-limit';
import { authLimiter } from '../server/dist/routes/auth.routes.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app, { apiLimiter } from '../server/dist/app.js';
import { initializeSocket } from '../server/dist/sockets/task.socket.js';
import { mailer } from '../server/dist/services/email.js';
if (process.env.NODE_ENV !== 'test') throw new Error('Browser fixture requires NODE_ENV=test');
const mongo = await MongoMemoryServer.create({ binary: { downloadDir: join(tmpdir(), 'taskflow-test-mongodb') } });
await mongoose.connect(mongo.getUri());
await Promise.all(Object.values(mongoose.models).map(model => model.init()));
// Isolated browser fixture only: never contacts an external mail service.
const mailbox = [];
mailer.sendMail = async message => { mailbox.push(message); return {}; };
const fixture = express();
// This endpoint exists only in the isolated NODE_ENV=test fixture.
fixture.post('/__test/reset-rate-limits', (req, res) => {
  const key = ipKeyGenerator(req.ip);
  authLimiter.resetKey(key);
  apiLimiter.resetKey(key);
  res.sendStatus(204);
});
fixture.get('/__test/mail', (req, res) => res.json(mailbox.filter(message => message.to.address === req.query.email)));
fixture.use(app);
const server = createServer(fixture);
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
