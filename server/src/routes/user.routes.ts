import { Router } from "express";
import type { Request, Response } from "express";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

// GET /api/v1/users/search?q=john
// Search users by name, username, or email (for invite flow)
router.get(
    "/search",
    authMiddleware,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const query = req.query.q as string | undefined;

        if (!query || query.trim().length < 2) {
            res.status(200).json({ success: true, data: [] });
            return;
        }

        const regex = new RegExp(query.trim(), "i");

        const users = await User.find({
            $or: [
                { firstName: regex },
                { lastName: regex },
                { username: regex },
                { email: regex },
            ],
        })
            .select("firstName lastName username email")
            .limit(10);

        res.status(200).json({
            success: true,
            data: users,
        });
    })
);

export default router;
