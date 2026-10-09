import {
    useProjectProgress,
    useUserPerformance,
    useTimeline,
} from "../hooks/useAnalytics";

interface AnalyticsDashboardProps {
    projectId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const StatusBadge = ({ label, count, color }: { label: string; count: number; color: string }) => (
    <div className={`${color} rounded-lg p-4 flex flex-col items-center`}>
        <span className="text-2xl font-bold">{count}</span>
        <span className="text-xs font-medium mt-1">{label}</span>
    </div>
);

const BarSegment = ({ pct, color, label }: { pct: number; color: string; label: string }) =>
    pct > 0 ? (
        <div
            className={`${color} h-full transition-all duration-500`}
            style={{ width: `${pct}%` }}
            title={`${label}: ${pct}%`}
        />
    ) : null;

// ─── Component ────────────────────────────────────────────────────────────────

const AnalyticsDashboard = ({ projectId }: AnalyticsDashboardProps) => {
    const { data: progress, isLoading: progressLoading } = useProjectProgress(projectId);
    const { data: users, isLoading: usersLoading } = useUserPerformance(projectId);
    const { data: timeline, isLoading: timelineLoading } = useTimeline(projectId);

    const isLoading = progressLoading || usersLoading || timelineLoading;

    if (isLoading) {
        return (
            <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-lg border border-white/10 p-6 animate-pulse">
                        <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
                        <div className="h-32 bg-white/5 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    const todoPct = progress && progress.totalTasks > 0
        ? Math.round((progress.tasksByStatus.todo / progress.totalTasks) * 100)
        : 0;
    const inProgressPct = progress && progress.totalTasks > 0
        ? Math.round((progress.tasksByStatus.in_progress / progress.totalTasks) * 100)
        : 0;
    const donePct = progress && progress.totalTasks > 0
        ? Math.round((progress.tasksByStatus.done / progress.totalTasks) * 100)
        : 0;

    // Find the max "created" value across the last 30 days for scaling the bar chart
    const maxCreated = timeline?.last30Days.reduce((max, d) => Math.max(max, d.created, d.completed), 0) ?? 1;

    return (
        <div className="space-y-6">
            {/* ── Overview Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-lg border border-white/10 p-5 text-center">
                    <p className="text-3xl font-bold text-white">{progress?.totalTasks ?? 0}</p>
                    <p className="text-sm text-slate-400 mt-1">Total Tasks</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-lg border border-white/10 p-5 text-center">
                    <p className="text-3xl font-bold text-indigo-400">{progress?.completionRate ?? 0}%</p>
                    <p className="text-sm text-slate-400 mt-1">Completion Rate</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-lg border border-white/10 p-5 text-center">
                    <p className="text-3xl font-bold text-red-600">{timeline?.overdueTasks ?? 0}</p>
                    <p className="text-sm text-slate-400 mt-1">Overdue Tasks</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-lg border border-white/10 p-5 text-center">
                    <p className="text-3xl font-bold text-white">{users?.length ?? 0}</p>
                    <p className="text-sm text-slate-400 mt-1">Contributors</p>
                </div>
            </div>

            {/* ── Status Breakdown ── */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-lg border border-white/10 p-6">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Tasks by Status</h3>

                {progress && progress.totalTasks > 0 ? (
                    <>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <StatusBadge label="To Do" count={progress.tasksByStatus.todo} color="bg-white/5 text-slate-200" />
                            <StatusBadge label="In Progress" count={progress.tasksByStatus.in_progress} color="bg-blue-900/20 text-indigo-300" />
                            <StatusBadge label="Done" count={progress.tasksByStatus.done} color="bg-emerald-900/20 text-emerald-300" />
                        </div>

                        {/* Stacked bar */}
                        <div className="w-full h-4 rounded-full overflow-hidden flex bg-gray-200">
                            <BarSegment pct={donePct} color="bg-emerald-900/200" label="Done" />
                            <BarSegment pct={inProgressPct} color="bg-blue-900/200" label="In Progress" />
                            <BarSegment pct={todoPct} color="bg-gray-400" label="To Do" />
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 mt-2">
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-900/200 inline-block" /> Done {donePct}%</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-900/200 inline-block" /> In Progress {inProgressPct}%</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> To Do {todoPct}%</div>
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-slate-500 text-center py-8">No tasks to show</p>
                )}
            </div>

            {/* ── 30-Day Timeline (bar chart) ── */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-lg border border-white/10 p-6">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Activity — Last 30 UTC Days</h3>

                <p className="mb-3 text-sm text-slate-400">Creation and completion events over 30 UTC days. Reopened tasks can complete more than once; archiving preserves history.</p>
                {timeline && timeline.last30Days.length > 0 ? (
                    <div className="overflow-x-auto">
                        <div className="flex items-end gap-1 min-w-[600px] h-40">
                            {timeline.last30Days.map((day) => {
                                const createdH = maxCreated > 0 ? (day.created / maxCreated) * 100 : 0;
                                const completedH = maxCreated > 0 ? (day.completed / maxCreated) * 100 : 0;
                                const dateLabel = new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                                return (
                                    <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5 group" title={`${dateLabel} — Created: ${day.created}, Completed: ${day.completed}`}>
                                        <div className="w-full flex gap-0.5 items-end" style={{ height: "120px" }}>
                                            <div
                                                className="flex-1 bg-blue-400 rounded-t transition-all duration-300"
                                                style={{ height: `${Math.max(createdH, 4)}%` }}
                                            />
                                            <div
                                                className="flex-1 bg-green-400 rounded-t transition-all duration-300"
                                                style={{ height: `${Math.max(completedH, completedH > 0 ? 4 : 0)}%` }}
                                            />
                                        </div>
                                        <span className="text-[9px] text-slate-500 rotate-[-45deg] origin-top-left mt-1 whitespace-nowrap hidden group-hover:block">
                                            {dateLabel}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-center gap-6 mt-4 text-xs text-slate-400">
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Created</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Completed</div>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 text-center py-8">No activity in the last 30 days</p>
                )}
            </div>

            {/* ── Team Performance ── */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-lg border border-white/10 p-6">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Team Performance</h3>

                {users && users.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-left text-slate-400">
                                    <th className="pb-3 font-medium">Member</th>
                                    <th className="pb-3 font-medium text-center">Created</th>
                                    <th className="pb-3 font-medium text-center">Done</th>
                                    <th className="pb-3 font-medium text-center">In Progress</th>
                                    <th className="pb-3 font-medium text-center">To Do</th>
                                    <th className="pb-3 font-medium text-center">Completion</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map((u) => (
                                    <tr key={u.user.id} className="hover:bg-transparent">
                                        <td className="py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-blue-900/200 flex items-center justify-center text-white text-xs font-medium">
                                                    {u.user.name.split(" ").map((n) => n[0]).join("")}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">{u.user.name}</p>
                                                    <p className="text-xs text-slate-500">{u.user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 text-center text-slate-200">{u.tasksAssigned}</td>
                                        <td className="py-3 text-center text-green-700 font-medium">{u.tasksCompleted}</td>
                                        <td className="py-3 text-center text-blue-700">{u.tasksInProgress}</td>
                                        <td className="py-3 text-center text-slate-400">{u.tasksTodo}</td>
                                        <td className="py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-900/200 rounded-full transition-all duration-500"
                                                        style={{ width: `${u.completionRate}%` }}
                                                    />
                                                </div>
                                                <span className="text-slate-200 font-medium">{u.completionRate}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 text-center py-8">No contributor data yet</p>
                )}
            </div>

            {/* ── Tasks by Member (from progress endpoint) ── */}
            {progress && progress.tasksByMember.length > 0 && (
                <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-lg border border-white/10 p-6">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Tasks Created per Member</h3>
                    <div className="space-y-3">
                        {progress.tasksByMember.map((m) => {
                            const barWidth = progress.totalTasks > 0 ? (m.count / progress.totalTasks) * 100 : 0;
                            return (
                                <div key={m.user.id} className="flex items-center gap-3">
                                    <span className="text-sm text-slate-200 w-32 truncate">{m.user.name}</span>
                                    <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-900/200 rounded-full transition-all duration-500"
                                            style={{ width: `${barWidth}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-slate-200 w-8 text-right">{m.count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
