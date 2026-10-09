export const events = Object.freeze({
  projectJoin: "project:join", projectLeave: "project:leave", projectJoined: "project:joined",
  projectEvicted: "project:evicted", projectChanged: "project:changed", projectDeleted: "project:deleted",
  taskCreated: "task:created", taskUpdated: "task:updated", taskDeleted: "task:deleted",
  memberAdded: "member:added", memberRemoved: "member:removed", memberRoleChanged: "member:role-changed", ownershipTransferred: "member:ownership-transferred",
  commentCreated: "comment:created", commentDeleted: "comment:deleted", activityCreated: "activity:created",
  notificationNew: "notification:new",
});
