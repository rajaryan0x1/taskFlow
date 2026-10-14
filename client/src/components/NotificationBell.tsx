import { events } from "@taskflow/contracts";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useInfiniteQuery } from "@tanstack/react-query";
import api from "../api/axios";
import { queryClient } from "../api/queryClient";
import { initSocket } from "../socket/socket";
import type { AppNotification } from "../types";
import { Icon } from "./layout/Icon";
interface NotificationResponse { data: AppNotification[]; pagination: { unread: number; page: number; pages: number } }
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const query = useInfiniteQuery({ queryKey: ["notifications"], initialPageParam: 1,
    getNextPageParam: (last: NotificationResponse) => last.pagination.page < last.pagination.pages ? last.pagination.page + 1 : undefined,
    queryFn: async ({ pageParam, signal }) => (await api.get<NotificationResponse>("/notifications", { signal, params: { page: pageParam, limit: 20 } })).data,
  });
  useEffect(() => {
    const outside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape" && open) { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("mousedown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  useEffect(() => {
    const socket = initSocket();
    const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["notifications"] }); void queryClient.invalidateQueries({ queryKey: ["personal-tasks"] }); };
    socket.on(events.notificationNew, refresh); socket.on("connect", refresh);
    return () => { socket.off(events.notificationNew, refresh); socket.off("connect", refresh); };
  }, []);
  const markRead = useMutation({ mutationFn: (id: string) => api.patch(`/notifications/${id}/read`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });
  const markAll = useMutation({ mutationFn: () => api.patch("/notifications/read-all"), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });
  const notifications = query.data?.pages.flatMap(page => page.data) ?? [];
  const unread = query.data?.pages[0]?.pagination.unread ?? 0;
  const describe = (n: AppNotification) => n.type === "task_assigned" ? `Assigned: ${n.payload.taskTitle ?? "a task"}` : n.type === "member_invited" ? `Invited to ${n.payload.projectName ?? "a project"}` : n.type === "due_soon" ? `Due soon: ${n.payload.taskTitle ?? "a task"}` : `Mentioned in ${n.payload.taskTitle ?? "a comment"}`;
  return <div className="relative" ref={ref}><button ref={trigger} type="button" aria-label="Notifications" aria-expanded={open} aria-controls="notification-panel" className="icon-button relative" onClick={() => setOpen(value => !value)}><svg aria-hidden="true" width="19" height="19" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.6"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" strokeLinecap="round" strokeLinejoin="round" /></svg>{unread > 0 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-indigo-500"><span className="sr-only">{unread} unread</span></span>}</button>
  {open && <section id="notification-panel" aria-label="Notifications" className="notification-panel surface"><div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4"><div><h2 className="font-semibold">Notifications</h2><p className="mt-1 text-[11px] text-slate-500">{unread} unread · retained for 30 days</p></div><button className="text-xs font-medium text-indigo-600" disabled={markAll.isPending || !unread} onClick={() => markAll.mutate()}>Mark all read</button></div><div className="max-h-96 overflow-y-auto">{query.isPending && <p role="status" className="p-6 text-slate-500">Loading notifications…</p>}{query.isError && <div role="alert" className="p-5"><p className="error-message">Notifications couldn’t be loaded.</p><button className="btn-secondary" onClick={() => void query.refetch()}>Retry</button></div>}{!query.isPending && !query.isError && !notifications.length && <div className="empty-state"><Icon name="check" size={23} /><h3>All quiet here</h3><p>Assignments and mentions will appear here.</p></div>}{notifications.map(n => <button key={n._id} className={`flex w-full gap-3 border-b border-slate-100 p-4 text-left ${n.read ? "bg-white" : "bg-indigo-50/50"}`} onClick={() => { if (!n.read) markRead.mutate(n._id); if (n.payload.projectId) { navigate(`/projects/${n.payload.projectId}${n.payload.taskId ? `?task=${n.payload.taskId}` : ""}`); setOpen(false); } }}><span className="avatar !h-7 !w-7"><Icon name="check" size={13} /></span><span><strong className="text-xs font-medium text-slate-700">{describe(n)}</strong><small className="mt-1 block text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</small></span></button>)}{query.hasNextPage && <div className="p-3 text-center"><button className="btn-secondary" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>Load more notifications</button></div>}</div>{(markRead.isError || markAll.isError) && <p role="alert" className="error-message px-4">Couldn’t mark notifications as read. Please retry.</p>}</section>}
  </div>;
}
