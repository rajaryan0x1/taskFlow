# TaskFlow

A real-time, role-based project management tool (Kanban board) built with the MERN stack (MongoDB, Express, React, Node.js) and Socket.IO.

## Features
- **Real-time Collaboration**: Kanban board updates instantly for all connected clients via Socket.IO.
- **Role-Based Access Control (RBAC)**: Projects support `owner`, `admin`, and `member` roles with granular permissions (e.g. only owners can delete a project, admins can manage members, members can only update tasks).
- **Kanban Board**: Drag-and-drop tasks between To Do, In Progress, and Done columns.
- **Activity & Analytics**: Rich activity logs track status changes, comments, and assignments. Analytics track team performance and burndown.
- **Live Notifications**: Get in-app alerts for @mentions, task assignments, and project invitations.

## Quick Start (Workspaces)

This project uses npm workspaces to manage both client and server from the root.

```bash
# 1. Install dependencies for both client and server
npm install

# 2. Start MongoDB locally (or set MONGO_URI in server/.env)
mongod

# 3. Start both dev servers concurrently
npm run dev
```

The React client will run on `http://localhost:5173` and the Express API on `http://localhost:5000`.

## Architecture
- **Client**: React 19, TypeScript, Vite, Tailwind CSS, TanStack React Query, Zustand.
- **Server**: Express, TypeScript, MongoDB (Mongoose), Socket.IO, Zod validation.

## Build for Production

```bash
npm run build
```
This builds both the server and client into their respective `dist/` directories.
