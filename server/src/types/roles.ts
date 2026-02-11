
// Project level Role
export enum ProjectRole {
    OWNER = "owner",
    ADMIN = "admin",
    MEMBER = "member"
}

// App level Role

export enum AppRole {
    APP_ADMIN = "app_admin",
    USER = "user"
}

// export const ProjectRoleHierarchy: Record<ProjectRole, number> = {
//     [ProjectRole.OWNER]: 3,
//     [ProjectRole.ADMIN]: 2,
//     [ProjectRole.MEMBER]: 1
// };

export const PROJECT_ROLE_HIERARCHY: ProjectRole[] = [
  ProjectRole.MEMBER,
  ProjectRole.ADMIN,
  ProjectRole.OWNER,
];

export const PERMISSIONS = {
  // Project
  PROJECT_DELETE:              [ProjectRole.OWNER],
  PROJECT_UPDATE:              [ProjectRole.OWNER, ProjectRole.ADMIN],
  PROJECT_INVITE_MEMBER:       [ProjectRole.OWNER, ProjectRole.ADMIN],
  PROJECT_REMOVE_MEMBER:       [ProjectRole.OWNER, ProjectRole.ADMIN],
  PROJECT_CHANGE_MEMBER_ROLE:  [ProjectRole.OWNER],
  PROJECT_TRANSFER_OWNERSHIP:  [ProjectRole.OWNER],

  // Task
  TASK_CREATE:      [ProjectRole.OWNER, ProjectRole.ADMIN, ProjectRole.MEMBER],
  TASK_DELETE:      [ProjectRole.OWNER, ProjectRole.ADMIN],
  TASK_UPDATE_ANY:  [ProjectRole.OWNER, ProjectRole.ADMIN],
  TASK_UPDATE_OWN:  [ProjectRole.OWNER, ProjectRole.ADMIN, ProjectRole.MEMBER],

  // Chat
  CHAT_SEND:        [ProjectRole.OWNER, ProjectRole.ADMIN, ProjectRole.MEMBER],
  CHAT_DELETE_ANY:  [ProjectRole.OWNER, ProjectRole.ADMIN],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
