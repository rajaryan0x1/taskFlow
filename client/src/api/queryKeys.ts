export const queryKeys = {
  project: (id: string) => ["project", id] as const,
  tasks: (id: string) => ["tasks", id] as const,
  task: (projectId: string) => ["task", projectId] as const,
  analytics: (id: string) => ["analytics", id] as const,
};
