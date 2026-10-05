import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { initSocket, joinProject, leaveProject } from "../socket/socket";

export const useProjectSocket = (projectId: string | undefined) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    useEffect(() => {
        if (!projectId) return;

        let socket;
        try {
            socket = initSocket();
        } catch (error) {
            console.error("Failed to initialize socket:", error);
            return;
        }

        joinProject(projectId);

        const handleTaskChange = () => {
            queryClient.invalidateQueries({ queryKey: ["tasks", projectId], refetchType: 'active' });
            queryClient.invalidateQueries({ queryKey: ["project-analytics", projectId] });
        };

        const handleMemberChange = () => {
            queryClient.invalidateQueries({ queryKey: ["project", projectId], refetchType: 'active' });
        };

        const handleKick = () => {
            queryClient.invalidateQueries();
            navigate("/");
        };

        socket.on("project:kick", handleKick);
        socket.on("task:created", handleTaskChange);
        socket.on("task:updated", handleTaskChange);
        socket.on("task:deleted", handleTaskChange);
        socket.on("member:added", handleMemberChange);
        socket.on("member:removed", handleMemberChange);
        socket.on("member:ownership-transferred", handleMemberChange);

        return () => {
            socket.off("project:kick", handleKick);
            socket.off("task:created", handleTaskChange);
            socket.off("task:updated", handleTaskChange);
            socket.off("task:deleted", handleTaskChange);
            socket.off("member:added", handleMemberChange);
            socket.off("member:removed", handleMemberChange);
            socket.off("member:ownership-transferred", handleMemberChange);
            leaveProject(projectId);
        };
    }, [projectId, queryClient]);
};
