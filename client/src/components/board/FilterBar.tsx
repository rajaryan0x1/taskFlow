import { Member } from "../../types";

interface FilterBarProps {
    titleFilter: string;
    setTitleFilter: (v: string) => void;
    assigneeFilter: string;
    setAssigneeFilter: (v: string) => void;
    priorityFilters: Set<string>;
    togglePriorityFilter: (p: string) => void;
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
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
            <input
                type="text"
                placeholder="Search tasks..."
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
        </div>
        <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
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
                                ? "bg-red-100 border-red-200 text-red-800"
                                : p === "medium"
                                ? "bg-yellow-100 border-yellow-200 text-yellow-800"
                                : "bg-green-100 border-green-200 text-green-800"
                            : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
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
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
                Clear filters
            </button>
        )}
    </div>
);
