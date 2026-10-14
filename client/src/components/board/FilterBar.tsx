import type { Member } from "../../types";

interface FilterBarProps {
    titleFilter: string;
    setTitleFilter: (v: string) => void;
    assigneeFilter: string;
    setAssigneeFilter: (v: string) => void;
    priorityFilters: Set<string>;
    togglePriorityFilter: (p: "low" | "medium" | "high") => void;
    clearFilters: () => void;
    projectMembers: Member[];
}

export const FilterBar = ({
    titleFilter,
    setTitleFilter,
    assigneeFilter,
    setAssigneeFilter,
    priorityFilters,
    togglePriorityFilter,
    clearFilters,
    projectMembers
}: FilterBarProps) => (
    <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
            <input
                aria-label="Search tasks"
                type="text"
                placeholder="Search tasks..."
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
        </div>
        <select
            aria-label="Filter by assignee"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 text-sm focus:ring-blue-500 focus:border-blue-500"
        >
            <option value="all">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {projectMembers.map((member) => (
                <option key={member.user._id} value={member.user._id}>
                    {member.user.firstName} {member.user.lastName}
                </option>
            ))}
        </select>
        <div className="flex gap-2">
            {(["low", "medium", "high"] as const).map((p) => (
                <button
                    key={p}
                    aria-pressed={priorityFilters.has(p)}
                    onClick={() => togglePriorityFilter(p)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-colors ${
                        priorityFilters.has(p)
                            ? p === "high"
                                ? "bg-rose-50 border-red-200 text-rose-700"
                                : p === "medium"
                                ? "bg-amber-50 border-yellow-200 text-amber-700"
                                : "bg-emerald-50 border-green-200 text-emerald-700"
                            : "bg-transparent border-slate-200 text-slate-500 hover:bg-white"
                    }`}
                >
                    {p}
                </button>
            ))}
        </div>
        {(titleFilter || assigneeFilter !== "all" || priorityFilters.size > 0) && (
            <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-600"
            >
                Clear filters
            </button>
        )}
    </div>
);
