import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../api/axios";
import { queryClient } from "../api/queryClient";
import { useAuthStore } from "../stores/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
    user: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    role: string;
}

interface SearchUser {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
}

interface MembersPanelProps {
    projectId: string;
    members: Member[];
    currentUserRole: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const MembersPanel = ({ projectId, members, currentUserRole }: MembersPanelProps) => {
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUserRole === "owner" || currentUserRole === "admin";

    // ── Invite state ──
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ── User search query ──
    const { data: searchResults } = useQuery({
        queryKey: ["userSearch", debouncedQuery],
        queryFn: async () => {
            const res = await api.get<{ data: SearchUser[] }>(`/users/search?q=${encodeURIComponent(debouncedQuery)}`);
            return res.data.data;
        },
        enabled: debouncedQuery.length >= 2,
    });

    // Filter out existing members from search results
    const memberIds = new Set(members.map((m) => m.user._id));
    const filteredResults = searchResults?.filter((u) => !memberIds.has(u._id)) ?? [];

    // ── Mutations ──
    const inviteMutation = useMutation({
        mutationFn: async (data: { userId: string; role: string }) => {
            const res = await api.post(`/projects/${projectId}/members`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["project", projectId] });
            setSearchQuery("");
            setDebouncedQuery("");
            setShowDropdown(false);
        },
    });

    const removeMutation = useMutation({
        mutationFn: async (userId: string) => {
            const res = await api.delete(`/projects/${projectId}/members/${userId}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["project", projectId] });
        },
    });

    const transferOwnershipMutation = useMutation({
        mutationFn: async (newOwnerId: string) => {
            const res = await api.post(`/projects/${projectId}/transfer-ownership`, { newOwnerId });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["project", projectId] });
        },
    });

    const handleInvite = (userId: string) => {
        inviteMutation.mutate({ userId, role: inviteRole });
    };

    const handleRemove = (userId: string, name: string) => {
        if (window.confirm(`Remove ${name} from this project?`)) {
            removeMutation.mutate(userId);
        }
    };

    const handleTransferOwnership = (userId: string, name: string) => {
        if (window.confirm(`Transfer ownership to ${name}? They will become the new project owner.`)) {
            transferOwnershipMutation.mutate(userId);
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case "owner":
                return "bg-purple-100 text-purple-800";
            case "admin":
                return "bg-blue-100 text-blue-800";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    return (
        <div className="space-y-6">
            {/* ── Invite Section ── */}
            {canManage && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                        Invite Member
                    </h3>
                    <div className="flex gap-3 items-start">
                        <div className="flex-1 relative" ref={dropdownRef}>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowDropdown(true);
                                }}
                                onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                                placeholder="Search by name, username, or email..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />

                            {/* Search results dropdown */}
                            {showDropdown && debouncedQuery.length >= 2 && (
                                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {filteredResults.length > 0 ? (
                                        filteredResults.map((user) => (
                                            <button
                                                key={user._id}
                                                onClick={() => handleInvite(user._id)}
                                                disabled={inviteMutation.isPending}
                                                className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center justify-between border-b border-gray-100 last:border-0 disabled:opacity-50"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                                                        {user.firstName[0]}{user.lastName[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {user.firstName} {user.lastName}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            @{user.username} · {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-blue-600 font-medium">
                                                    Invite
                                                </span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                            No users found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
                            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    {inviteMutation.isError && (
                        <p className="mt-2 text-sm text-red-600">
                            Failed to invite member. They may already be in the project.
                        </p>
                    )}
                    {inviteMutation.isSuccess && (
                        <p className="mt-2 text-sm text-green-600">Member invited successfully!</p>
                    )}
                </div>
            )}

            {/* ── Members List ── */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                    Project Members ({members.length})
                </h3>

                <div className="divide-y divide-gray-100">
                    {members.map((member) => {
                        const isCurrentUser = member.user._id === currentUser?.id;
                        const isOwner = member.role === "owner";
                        const canRemove = canManage && !isOwner && !isCurrentUser;
                        const canTransferOwnership = currentUserRole === "owner" && !isOwner && !isCurrentUser;

                        return (
                            <div
                                key={member.user._id}
                                className="flex items-center justify-between py-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                                        {member.user.firstName[0]}{member.user.lastName[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {member.user.firstName} {member.user.lastName}
                                            {isCurrentUser && (
                                                <span className="ml-1 text-xs text-gray-400">(you)</span>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-500">{member.user.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span
                                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(member.role)}`}
                                    >
                                        {member.role}
                                    </span>

                                    {canTransferOwnership && (
                                        <button
                                            onClick={() =>
                                                handleTransferOwnership(
                                                    member.user._id,
                                                    `${member.user.firstName} ${member.user.lastName}`
                                                )
                                            }
                                            disabled={transferOwnershipMutation.isPending}
                                            className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded hover:bg-purple-200 transition-colors disabled:opacity-50"
                                            title="Make owner"
                                        >
                                            Make owner
                                        </button>
                                    )}

                                    {canRemove && (
                                        <button
                                            onClick={() =>
                                                handleRemove(
                                                    member.user._id,
                                                    `${member.user.firstName} ${member.user.lastName}`
                                                )
                                            }
                                            disabled={removeMutation.isPending}
                                            className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                            title="Remove member"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default MembersPanel;
