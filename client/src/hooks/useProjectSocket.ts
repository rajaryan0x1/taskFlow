import { events, type ProjectEvent } from "@taskflow/contracts";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { initSocket, joinProject, leaveProject } from "../socket/socket";
import { queryKeys } from "../api/queryKeys";

export const useProjectSocket = (projectId: string | undefined) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!projectId) return;
    const socket = initSocket();
    const taskChanged = () => {
      for (const key of [queryKeys.tasks(projectId), queryKeys.task(projectId), queryKeys.analytics(projectId)]) void queryClient.invalidateQueries({ queryKey: key });
    };
    const projectChanged = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      taskChanged();
    };
    const joined = (event: ProjectEvent) => {
      if (event.projectId !== projectId) return;
      setConnected(true);
      projectChanged();
      void queryClient.invalidateQueries({ queryKey: ["comments"] });
      void queryClient.invalidateQueries({ queryKey: ["activity"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };
    const disconnected = () => setConnected(false);
    const evicted = (event: ProjectEvent) => {
      if (event.projectId !== projectId) return;
      void queryClient.cancelQueries();
      queryClient.clear();
      leaveProject(projectId);
      navigate("/", { replace: true });
    };
    const taskEvents = [events.taskCreated, events.taskUpdated, events.taskDeleted];
    const projectEvents = [events.memberAdded, events.memberRemoved, events.memberRoleChanged, events.ownershipTransferred, events.projectChanged];
    taskEvents.forEach(event => socket.on(event, taskChanged));
    projectEvents.forEach(event => socket.on(event, projectChanged));
    socket.on(events.projectJoined, joined);
    socket.on(events.projectEvicted, evicted);
    socket.on(events.projectDeleted, evicted);
    socket.on("disconnect", disconnected);
    joinProject(projectId);
    return () => {
      taskEvents.forEach(event => socket.off(event, taskChanged));
      projectEvents.forEach(event => socket.off(event, projectChanged));
      socket.off(events.projectJoined, joined);
      socket.off(events.projectEvicted, evicted);
      socket.off(events.projectDeleted, evicted);
      socket.off("disconnect", disconnected);
      leaveProject(projectId);
    };
  }, [projectId, queryClient, navigate]);
  return connected;
};
