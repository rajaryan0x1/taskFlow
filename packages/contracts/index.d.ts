export declare const events: {
  readonly projectJoin: "project:join"; readonly projectLeave: "project:leave"; readonly projectJoined: "project:joined";
  readonly projectEvicted: "project:evicted"; readonly projectChanged: "project:changed"; readonly projectDeleted: "project:deleted";
  readonly taskCreated: "task:created"; readonly taskUpdated: "task:updated"; readonly taskDeleted: "task:deleted";
  readonly memberAdded: "member:added"; readonly memberRemoved: "member:removed"; readonly memberRoleChanged: "member:role-changed"; readonly ownershipTransferred: "member:ownership-transferred";
  readonly commentCreated: "comment:created"; readonly commentDeleted: "comment:deleted"; readonly activityCreated: "activity:created";
  readonly notificationNew: "notification:new";
};
export interface ProjectEvent { projectId: string }
export type ProjectRole = "owner" | "admin" | "member";
export interface PublicUser {
  id: string; firstName: string; lastName: string; username: string; email: string;
  appRole: "app_admin" | "user"; authProvider?: "local" | "google"; needsProfileCompletion?: boolean;
}
