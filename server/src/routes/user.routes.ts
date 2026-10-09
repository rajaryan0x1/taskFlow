import { z } from "zod";
import { parseInput } from "../utils/input.js";
import { Router } from "express";
import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import { Project } from "../models/Project.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

export function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const searchLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // Stricter limit
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many search requests. Please try again later." },
});

// GET /api/v1/users/search?q=john
// Search users by name, username, or email (for invite flow)
router.get(
    "/search",
    authMiddleware,
    searchLimiter,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const { q: query } = parseInput(z.object({ q: z.string().trim().max(100).optional().default("") }), req.query);

        if (query.length < 2 || query.length > 100) {
            res.status(200).json({ success: true, data: [] });
            return;
        }

        const regex = new RegExp(escapeRegex(query), "i");

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

        // Find co-members to determine if email should be masked
        const myProjects = await Project.find({ "members.user": req.user!.id }).select("members.user");
        const coMemberIds = new Set<string>();
        for (const p of myProjects) {
            for (const m of p.members) {
                coMemberIds.add(m.user.toString());
            }
        }
        coMemberIds.add(req.user!.id);

        const maskedUsers = users.map((u) => {
            const isCoMember = coMemberIds.has(u._id.toString());
            const email = isCoMember ? u.email : u.email.replace(/(?<=^.).+(?=@)/, "***");
            return {
                id: u._id,
                firstName: u.firstName,
                lastName: u.lastName,
                username: u.username,
                email,
            };
        });

        res.status(200).json({
            success: true,
            data: maskedUsers,
        });
    })
);

export default router;
