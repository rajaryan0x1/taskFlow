import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import morgan from 'morgan';

import mainRouter from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

app.use(cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
}));
app.use(helmet());
app.use(express.json());

if (env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.use('/api/v1', apiLimiter, mainRouter);

app.get('/health', (_req, res) => {
    res.status(200).json({ message: 'Server is healthy' });
});

app.use(errorHandler);

export default app;