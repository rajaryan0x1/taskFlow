import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { queryClient } from "../api/queryClient";
import type { Project, Member } from "../types";
import { getErrorMessage } from "../utils/apiError";

export function ProjectSettings({ project, role }: { project: Project; role: Member["role"] }) {
  const navigate = useNavigate();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const change = useMutation({
    mutationFn: async (action: "save" | "archive" | "restore" | "delete") => {
      const url = `/projects/${project._id}`;
      if (action === "save") await api.patch(url, { name, description });
      if (action === "archive") await api.delete(url);
      if (action === "restore") await api.post(`${url}/restore`);
      if (action === "delete") await api.delete(`${url}?hard=true`);
      return action;
    },
    onSuccess: (action) => {
      void queryClient.invalidateQueries({ queryKey: ["project", project._id] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks", project._id] });
      if (action === "delete") navigate("/");
    },
  });
  const canManage = role === "owner" || role === "admin";
  return <section className="max-w-2xl space-y-6 rounded-xl border border-white/10 bg-white/5 p-6">
    <h2 className="text-xl font-semibold">Project settings</h2>
    <form onSubmit={e => { e.preventDefault(); change.mutate("save"); }} className="space-y-4">
      <label className="block">Name<input required minLength={2} maxLength={100} disabled={!canManage || project.isArchived} value={name} onChange={e => setName(e.target.value)} className="mt-2 block w-full rounded border border-white/20 bg-slate-900 p-2" /></label>
      <label className="block">Description<textarea maxLength={500} disabled={!canManage || project.isArchived} value={description} onChange={e => setDescription(e.target.value)} className="mt-2 block w-full rounded border border-white/20 bg-slate-900 p-2" /></label>
      {canManage && !project.isArchived && <button disabled={change.isPending} className="rounded bg-indigo-600 px-4 py-2 disabled:opacity-50">Save changes</button>}
    </form>
    {change.isError && <p role="alert" className="text-rose-300">{getErrorMessage(change.error)}</p>}
    {change.isSuccess && <p role="status" className="text-emerald-300">Project updated.</p>}
    <div className="flex flex-wrap gap-4 border-t border-white/10 pt-4">
      {canManage && project.isArchived && <button disabled={change.isPending} onClick={() => change.mutate("restore")} className="rounded border border-white/20 px-4 py-2">Restore project</button>}
      {role === "owner" && !project.isArchived && <button disabled={change.isPending} onClick={() => { if (confirm("Archive this project? You can restore it later.")) change.mutate("archive"); }} className="rounded border border-white/20 px-4 py-2">Archive project</button>}
      {role === "owner" && <button disabled={change.isPending} onClick={() => { if (prompt(`Type ${project.name} to permanently delete this project and its tasks.`) === project.name) change.mutate("delete"); }} className="rounded border border-rose-400 px-4 py-2 text-rose-300">Permanently delete project</button>}
    </div>
  </section>;
}
