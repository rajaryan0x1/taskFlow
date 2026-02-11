import {Router } from 'express';
import type { Request, Response } from 'express';
import authRoutes  from './auth.routes.js';
import projectRoutes from "./project.routes.js"
const router = Router();


router.use("/auth" , authRoutes)

router.use("/projects" , projectRoutes)

export default router;