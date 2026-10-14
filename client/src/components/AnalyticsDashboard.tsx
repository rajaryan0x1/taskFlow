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
    const { data: progress, isLoading: progressLoading, isError: progressError, refetch: refetchProgress } = useProjectProgress(projectId);
    const { data: users, isLoading: usersLoading, isError: usersError, refetch: refetchUsers } = useUserPerformance(projectId);
    const { data: timeline, isLoading: timelineLoading, isError: timelineError, refetch: refetchTimeline } = useTimeline(projectId);

    const isLoading = progressLoading || usersLoading || timelineLoading;

    if (isLoading) {
        return (
            <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white border border-slate-200 text-slate-900 rounded-lg p-6 animate-pulse">
                        <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
                        <div className="h-32 bg-white rounded" />
                    </div>
                ))}
            </div>
        );
    }

    if (progressError || usersError || timelineError) return <div role="alert" className="surface p-6"><h2 className="font-semibold">Analytics couldn’t be loaded</h2><p className="mt-2 mb-4 text-sm text-slate-500">Try again to get an accurate picture of your project.</p><button className="btn-secondary" onClick={() => { void refetchProgress(); void refetchUsers(); void refetchTimeline(); }}>Try again</button></div>;

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
                <div className="bg-white border border-slate-200 text-slate-900 rounded-lg p-5 text-center">
                    <p className="text-3xl font-bold text-slate-900">{progress?.totalTasks ?? 0}</p>
                    <p className="text-sm text-slate-500 mt-1">Total Tasks</p>
                </div>
                <div className="bg-white border border-slate-200 text-slate-900 rounded-lg p-5 text-center">
                    <p className="text-3xl font-bold text-indigo-600">{progress?.completionRate ?? 0}%</p>
                    <p className="text-sm text-slate-500 mt-1">Completion Rate</p>
                </div>
                <div className="bg-white border border-slate-200 text-slate-900 rounded-lg p-5 text-center">
                    <p className="text-3xl font-bold text-red-600">{timeline?.overdueTasks ?? 0}</p>
                    <p className="text-sm text-slate-500 mt-1">Overdue Tasks</p>
                </div>
                <div className="bg-white border border-slate-200 text-slate-900 rounded-lg p-5 text-center">
                    <p className="text-3xl font-bold text-slate-900">{users?.length ?? 0}</p>
                    <p className="text-sm text-slate-500 mt-1">Contributors</p>
                </div>
            </div>

            {/* ── Status Breakdown ── */}
            <div className="bg-white border border-slate-200 text-slate-900 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-4">Tasks by Status</h3>

                {progress && progress.totalTasks > 0 ? (
                    <>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <StatusBadge label="To Do" count={progress.tasksByStatus.todo} color="bg-white text-slate-700" />
                            <StatusBadge label="In Progress" count={progress.tasksByStatus.in_progress} color="bg-indigo-50 text-indigo-600" />
                            <StatusBadge label="Done" count={progress.tasksByStatus.done} color="bg-emerald-50 text-emerald-700" />
                        </div>

                        {/* Stacked bar */}
                        <div className="w-full h-4 rounded-full overflow-hidden flex bg-gray-200">
                            <BarSegment pct={donePct} color="bg-emerald-500" label="Done" />
                            <BarSegment pct={inProgressPct} color="bg-indigo-500" label="In Progress" />
                            <BarSegment pct={todoPct} color="bg-gray-400" label="To Do" />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 mt-2">
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Done {donePct}%</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> In Progress {inProgressPct}%</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> To Do {todoPct}%</div>
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-slate-500 text-center py-8">No tasks to show</p>
                )}
            </div>

            {/* ── 30-Day Timeline (bar chart) ── */}
            <div className="bg-white border border-slate-200 text-slate-900 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-4">Activity — Last 30 UTC Days</h3>

                <p className="mb-3 text-sm text-slate-500">Creation and completion events over 30 UTC days. Reopened tasks can complete more than once; archiving preserves history.</p>
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
                                                className="flex-1 bg-indigo-400 rounded-t transition-all duration-300"
                                                style={{ height: `${Math.max(createdH, createdH > 0 ? 4 : 0)}%` }}
                                            />
                                            <div
                                                className="flex-1 bg-emerald-400 rounded-t transition-all duration-300"
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
                        <div className="flex justify-center gap-6 mt-4 text-xs text-slate-500">
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" /> Created</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Completed</div>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 text-center py-8">No activity in the last 30 days</p>
                )}
            </div>

            {/* ── Team Performance ── */}
            <div className="bg-white border border-slate-200 text-slate-900 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-4">Team Performance</h3>

                {users && users.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-slate-500">
                                    <th className="pb-3 font-medium">Member</th>
                                    <th className="pb-3 font-medium text-center">Assigned</th>
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
                                                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-medium">
                                                    {u.user.name.split(" ").map((n) => n[0]).join("")}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{u.user.name}</p>
                                                    <p className="text-xs text-slate-500">{u.user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 text-center text-slate-700">{u.tasksAssigned}</td>
                                        <td className="py-3 text-center text-green-700 font-medium">{u.tasksCompleted}</td>
                                        <td className="py-3 text-center text-blue-700">{u.tasksInProgress}</td>
                                        <td className="py-3 text-center text-slate-500">{u.tasksTodo}</td>
                                        <td className="py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${u.completionRate}%` }}
                                                    />
                                                </div>
                                                <span className="text-slate-700 font-medium">{u.completionRate}%</span>
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
                <div className="bg-white border border-slate-200 text-slate-900 rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-4">Tasks Assigned per Member</h3>
                    <div className="space-y-3">
                        {progress.tasksByMember.map((m) => {
                            const barWidth = progress.totalTasks > 0 ? (m.count / progress.totalTasks) * 100 : 0;
                            return (
                                <div key={m.user.id} className="flex items-center gap-3">
                                    <span className="text-sm text-slate-700 w-32 truncate">{m.user.name}</span>
                                    <div className="flex-1 h-5 bg-white rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                            style={{ width: `${barWidth}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 w-8 text-right">{m.count}</span>
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
