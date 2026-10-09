import { Activity } from "../models/Activity.js";
import { utcTimelineWindow } from "../utils/timeline.js";
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
                            id: { $ifNull: ["$$userDoc._id", "unassigned"] },
                            name: { $ifNull: [{ $concat: ["$$userDoc.firstName", " ", "$$userDoc.lastName"] }, "Unassigned or former member"] },
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
                                id: { $ifNull: ["$$userDoc._id", "unassigned"] },
                                name: { $ifNull: [{ $concat: ["$$userDoc.firstName", " ", "$$userDoc.lastName"] }, "Unassigned or former member"] },
                                email: { $ifNull: ["$$userDoc.email", ""] },
                            },
                        },
                    },
                    tasksAssigned: "$total",
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

        const { start, end, days } = utcTimelineWindow();
        const counts = await Activity.aggregate([
            { $match: {
                project: new Types.ObjectId(projectId.toString()),
                createdAt: { $gte: start, $lt: end },
                $or: [{ type: "created" }, { type: "status_changed", "meta.to": TaskStatus.DONE }],
            } },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
                created: { $sum: { $cond: [{ $eq: ["$type", "created"] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $or: [
                    { $eq: ["$type", "status_changed"] },
                    { $and: [{ $eq: ["$type", "created"] }, { $eq: ["$meta.status", TaskStatus.DONE] }] },
                ] }, 1, 0] } },
            } },
        ]);
        const byDate = new Map(counts.map(row => [row._id, row]));
        const timelinePipeline = days.map(day => ({ ...day, created: byDate.get(day.date)?.created ?? 0, completed: byDate.get(day.date)?.completed ?? 0 }));

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
                timezone: "UTC",
                metric: "completion_events",
                overdueTasks,
            },
        });
    }
);
