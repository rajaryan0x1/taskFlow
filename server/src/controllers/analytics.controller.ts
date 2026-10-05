import type { Request, Response } from "express";
import { Task, TaskStatus } from "../models/Task.js";
import asyncHandler from "../utils/asyncHandler.js";
import { Types } from "mongoose";



// GET /api/v1/projects/:projectId/analytics/progress

export const getProjectProgress = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const projectId = req.projectMembership!.project._id;

    // 1
    const tasksByStatusPipeline = await Task.aggregate([
        {
            $match: {
                project: new Types.ObjectId(projectId.toString()),
                isArchived: false,
            },
        },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
            },
        },
    ]);


    const tasksByStatus: Record<string, number> = {
        todo: 0,
        in_progress: 0,
        done: 0,
    }

    tasksByStatusPipeline.forEach((item) => {
        tasksByStatus[item._id] = item.count;
    })

    const totalTasks = Object.values(tasksByStatus).reduce((a, b) => a + b, 0);
    const completionRate =
        totalTasks > 0
            ? Math.round(((tasksByStatus.done || 0) / totalTasks) * 100)
            : 0;

    // 2
    const tasksByMemberPipeline = await Task.aggregate([
        {
            $match: {
                project: new Types.ObjectId(projectId.toString()),
                isArchived: false,
            },
        },
        {
            $group: {
                _id: "$assignee",
                count: { $sum: 1 },
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "userDetails",
            },
        },
        {
            $project: {
                _id: 0,
                user: {
                    $let: {
                        vars: {
                            userDoc: { $arrayElemAt: ["$userDetails", 0] },
                        },
                        in: {
                            id: "$$userDoc._id",
                            name: {
                                $concat: [
                                    "$$userDoc.firstName",
                                    " ",
                                    "$$userDoc.lastName",
                                ],
                            },
                        },
                    },
                },
                count: 1,
            },
        },
        {
            $sort: { count: -1 },
        },
    ]);

    res.status(200).json({
        success: true,
        data: {
            totalTasks,
            tasksByStatus,
            completionRate,
            tasksByMember: tasksByMemberPipeline,
        },
    });



})



// GET /api/v1/projects/:projectId/analytics/users
export const getUserPerformance = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const projectId = req.projectMembership!.project._id;

        // Complex aggregation: Group by user with conditional counting by status
        const userStatsPipeline = await Task.aggregate([
            {
                $match: {
                    project: new Types.ObjectId(projectId.toString()),
                    isArchived: false,
                },
            },
            {
                $group: {
                    _id: "$assignee",
                    total: { $sum: 1 },
                    completed: {
                        $sum: {
                            $cond: [{ $eq: ["$status", TaskStatus.DONE] }, 1, 0],
                        },
                    },
                    inProgress: {
                        $sum: {
                            $cond: [{ $eq: ["$status", TaskStatus.IN_PROGRESS] }, 1, 0],
                        },
                    },
                    todo: {
                        $sum: {
                            $cond: [{ $eq: ["$status", TaskStatus.TODO] }, 1, 0],
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userDetails",
                },
            },
            {
                $project: {
                    _id: 0,
                    user: {
                        $let: {
                            vars: {
                                userDoc: { $arrayElemAt: ["$userDetails", 0] },
                            },
                            in: {
                                id: "$$userDoc._id",
                                name: {
                                    $concat: [
                                        "$$userDoc.firstName",
                                        " ",
                                        "$$userDoc.lastName",
                                    ],
                                },
                                email: "$$userDoc.email",
                            },
                        },
                    },
                    tasksCreated: "$total",
                    tasksCompleted: "$completed",
                    tasksInProgress: "$inProgress",
                    tasksTodo: "$todo",
                    completionRate: {
                        $round: [
                            {
                                $multiply: [
                                    {
                                        $cond: [
                                            { $eq: ["$total", 0] },
                                            0,
                                            { $divide: ["$completed", "$total"] },
                                        ],
                                    },
                                    100,
                                ],
                            },
                            0,
                        ],
                    },
                },
            },
            {
                $sort: { tasksCompleted: -1 },
            },
        ]);

        res.status(200).json({
            success: true,
            data: {
                users: userStatsPipeline,
            },
        });
    }
);

// GET /api/v1/projects/:projectId/analytics/timeline
export const getTimeline = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const projectId = req.projectMembership!.project._id;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Fetch created counts
        const createdPipeline = await Task.aggregate([
            {
                $match: {
                    project: new Types.ObjectId(projectId.toString()),
                    isArchived: false,
                    createdAt: { $gte: thirtyDaysAgo },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 },
                },
            }
        ]);

        // Fetch completed counts
        const completedPipeline = await Task.aggregate([
            {
                $match: {
                    project: new Types.ObjectId(projectId.toString()),
                    isArchived: false,
                    completedAt: { $gte: thirtyDaysAgo },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
                    count: { $sum: 1 },
                },
            }
        ]);

        const timelineMap = new Map<string, { date: string; created: number; completed: number }>();
        
        // Fill 30 days
        for (let i = 0; i <= 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0] as string;
            timelineMap.set(dateStr, { date: dateStr, created: 0, completed: 0 });
        }

        for (const item of createdPipeline) {
            if (timelineMap.has(item._id)) {
                timelineMap.get(item._id)!.created = item.count;
            }
        }

        for (const item of completedPipeline) {
            if (timelineMap.has(item._id)) {
                timelineMap.get(item._id)!.completed = item.count;
            }
        }

        const timelinePipeline = Array.from(timelineMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        // overdue tasks
        const overdueTasks = await Task.countDocuments({
            project: projectId,
            dueDate: { $lt: new Date() },
            status: { $ne: TaskStatus.DONE },
            isArchived: false,
        });

        res.status(200).json({
            success: true,
            data: {
                last30Days: timelinePipeline,
                overdueTasks,
            },
        });
    }
);
