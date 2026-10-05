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
    <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-lg border border-white/10 p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
            <input
                type="text"
                placeholder="Search tasks..."
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-white/10 rounded-md bg-slate-900/50 text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
        </div>
        <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-3 py-2 border border-white/10 rounded-md bg-slate-900/50 text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 text-sm focus:ring-blue-500 focus:border-blue-500"
        >
            <option value="all">All Assignees</option>
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
                    onClick={() => togglePriorityFilter(p)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-colors ${
                        priorityFilters.has(p)
                            ? p === "high"
                                ? "bg-rose-900/40 border-red-200 text-rose-300"
                                : p === "medium"
                                ? "bg-amber-900/40 border-yellow-200 text-amber-300"
                                : "bg-emerald-900/40 border-green-200 text-emerald-300"
                            : "bg-transparent border-white/10 text-slate-400 hover:bg-white/5"
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
                className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
            >
                Clear filters
            </button>
        )}
    </div>
);
