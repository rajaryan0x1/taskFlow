import {Router } from 'express';
import type { Request, Response } from 'express';
import authRoutes  from './auth.routes.js';
const router = Router();


router.use("/auth" , authRoutes)

export default router;