import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import morgan from 'morgan';
import { requireTrustedOrigin } from './middleware/origin.middleware.js';

import mainRouter from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

const app = express();

// Behind a reverse proxy, req.ip would otherwise be the proxy's address and
// every client would share one rate-limit bucket.
if (env.TRUST_PROXY > 0) {
    app.set('trust proxy', env.TRUST_PROXY);
}

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

app.use(cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
}));
app.use(helmet());
app.use(express.json({ limit: '100kb' }));

if (env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.get('/health', (_req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    res.status(dbConnected ? 200 : 503).json({
        status: dbConnected ? 'ok' : 'degraded',
        db: dbConnected ? 'connected' : 'disconnected',
        uptime: Math.round(process.uptime()),
    });
});

app.use('/api/v1', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); }, apiLimiter, requireTrustedOrigin, mainRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;