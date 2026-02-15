import {Router } from 'express';
import type { Request, Response } from 'express';
import authRoutes  from './auth.routes.js';
import projectRoutes from "./project.routes.js"
import taskRoutes , { projectTaskRoutes } from "./task.routes.js"
import userRoutes from "./user.routes.js"
const router = Router();


router.use("/auth" , authRoutes)

router.use("/projects" , projectRoutes)

router.use("/tasks" , taskRoutes)
router.use("/projects/:projectId/tasks" , projectTaskRoutes)

router.use("/users" , userRoutes)

export default router;