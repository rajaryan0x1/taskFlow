# TaskFlow

A real-time collaborative project management application built with the MERN stack and Socket.io. TaskFlow enables teams to create projects, manage tasks on a Kanban board, and see updates from teammates in real time.

## Features

- **User Authentication** — Register, login, and JWT-based session management
- **Project Management** — Create, update, archive, and delete projects
- **Role-Based Access Control** — Owner, Admin, and Member roles with granular permissions
- **Task Management** — Full CRUD on tasks with status, priority, assignee, and due dates
- **Real-Time Updates** — Socket.io broadcasts task changes to all project members instantly
- **Kanban Board** — Visual task board with Todo, In Progress, and Done columns
- **Team Collaboration** — Invite members via type-ahead user search, assign roles, and remove members with role-based permissions
- **Analytics Dashboard** — Interactive project analytics powered by MongoDB aggregation pipelines: overview cards, status breakdown with stacked progress bar, 30-day activity timeline bar chart, team performance table with per-member completion rates, and tasks-per-member distribution

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** + **Express 5** | REST API server |
| **TypeScript** | Type safety |
| **MongoDB** + **Mongoose** | Database & ODM |
| **Socket.io** | Real-time WebSocket communication |
| **JWT** | Stateless authentication |
| **bcrypt** | Password hashing |
| **Zod** | Request validation |
| **Helmet** | Security headers |
| **Morgan** | HTTP request logging |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **TanStack React Query** | Server state management & caching |
| **Zustand** | Client state management (auth) |
| **React Router v7** | Client-side routing |
| **Socket.io Client** | Real-time updates |
| **Tailwind CSS** | Utility-first styling |

## Project Structure

```
taskflow/
├── client/                   # React frontend
│   ├── src/
│   │   ├── api/              # Axios instance & React Query client
│   │   ├── components/       # Reusable UI components (TaskEditModal, AnalyticsDashboard, MembersPanel)
│   │   ├── hooks/            # Custom React hooks (useAnalytics)
│   │   ├── pages/            # Route-level page components
│   │   ├── socket/           # Socket.io client setup
│   │   ├── stores/           # Zustand state stores
│   │   ├── App.tsx           # Route definitions
│   │   └── main.tsx          # App entry point
│   └── package.json
├── server/                   # Express backend
│   ├── src/
│   │   ├── config/           # DB connection & environment variables
│   │   ├── controllers/      # Route handler logic
│   │   ├── middleware/       # Auth, RBAC, error handling
│   │   ├── models/           # Mongoose schemas (User, Project, Task)
│   │   ├── routes/           # Express route definitions
│   │   ├── sockets/          # Socket.io event handlers
│   │   ├── types/            # Shared TypeScript types & enums
│   │   ├── utils/            # ApiError, asyncHandler
│   │   ├── app.ts            # Express app setup
│   │   └── server.ts         # HTTP server & Socket.io init
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **MongoDB** (local instance or MongoDB Atlas)
- **npm** or **yarn**

### 1. Clone the repository

```bash
git clone https://github.com/rajaryan0x1/taskflow.git
cd taskflow
```

### 2. Set up the server

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/taskflow
JWT_SECRET=your_jwt_secret_here
NODE_ENV=development
```

Start the development server:

```bash
npm run dev
```

### 3. Set up the client

```bash
cd client
npm install
npm run dev
```

The client runs on `http://localhost:5173` by default and proxies API requests to `http://localhost:5000`.

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create a new account |
| POST | `/api/v1/auth/login` | Sign in |
| POST | `/api/v1/auth/logout` | Sign out (client-side) |
| GET | `/api/v1/auth/me` | Get current user profile |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/projects` | Create a project |
| GET | `/api/v1/projects` | List user's projects |
| GET | `/api/v1/projects/:projectId` | Get project details |
| PATCH | `/api/v1/projects/:projectId` | Update project |
| DELETE | `/api/v1/projects/:projectId` | Archive/delete project |
| POST | `/api/v1/projects/:projectId/members` | Invite a member |
| DELETE | `/api/v1/projects/:projectId/members/:userId` | Remove a member |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/tasks` | Create a task |
| GET | `/api/v1/projects/:projectId/tasks` | List tasks in a project |
| GET | `/api/v1/projects/:projectId/tasks/:taskId` | Get task details |
| PATCH | `/api/v1/projects/:projectId/tasks/:taskId` | Update a task |
| DELETE | `/api/v1/projects/:projectId/tasks/:taskId` | Archive/delete a task |
| PATCH | `/api/v1/projects/:projectId/tasks/:taskId/assign` | Assign/unassign a task |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/search?q=...` | Search users by name, username, or email |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects/:projectId/analytics/progress` | Task counts by status & completion rate |
| GET | `/api/v1/projects/:projectId/analytics/users` | Per-user task stats |
| GET | `/api/v1/projects/:projectId/analytics/timeline` | 30-day creation & completion timeline |

## Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `project:join` | Client → Server | Join a project room for live updates |
| `project:leave` | Client → Server | Leave a project room |
| `task:created` | Server → Client | A new task was created |
| `task:updated` | Server → Client | A task was updated |
| `task:deleted` | Server → Client | A task was archived/deleted |
| `user:joined` | Server → Client | A team member came online in the project |
| `user:left` | Server → Client | A team member left the project room |

## Analytics

The project page has a **Board / Analytics** tab toggle. The Analytics view renders a full dashboard that consumes three MongoDB aggregation pipeline endpoints:

| Section | Description | Backend Endpoint |
|---|---|---|
| **Overview Cards** | Total tasks, completion rate %, overdue count, contributor count | `progress` |
| **Status Breakdown** | Per-status counts + stacked horizontal progress bar (Done / In Progress / To Do) | `progress` |
| **30-Day Timeline** | Bar chart of daily created vs completed tasks | `timeline` |
| **Team Performance** | Table with per-member created, done, in-progress, to-do counts and completion rate mini-bars | `users` |
| **Tasks per Member** | Horizontal bar chart showing task distribution across contributors | `progress` |

All data is fetched via React Query hooks (`useProjectProgress`, `useUserPerformance`, `useTimeline`) with automatic caching and background refetching.

## Member Management

The project page includes a **Members** tab (alongside Board and Analytics) with full member management:

- **Invite** — Debounced type-ahead search against `GET /api/v1/users/search`. Results exclude existing members. Click a user to invite them with a selectable role (Member or Admin).
- **Members list** — Displays all project members with avatar initials, name, email, and color-coded role badges (Owner / Admin / Member).
- **Remove** — Owners and Admins can remove non-owner members via an inline button with a confirmation dialog. The owner cannot be removed.

## Roles & Permissions

| Permission | Owner | Admin | Member |
|---|---|---|---|
| Create tasks | Yes | Yes | Yes |
| Update any task | Yes | Yes | No* |
| Delete tasks | Yes | Yes | No |
| Update project | Yes | Yes | No |
| Delete project | Yes | No | No |
| Invite members | Yes | Yes | No |
| Remove members | Yes | Yes | No |

> \* Members can update tasks assigned to them.

## Scripts

### Server
```bash
npm run dev      # Start dev server with hot reload (tsx watch)
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled production build
```

### Client
```bash
npm run dev      # Start Vite dev server
npm run build    # Type-check & build for production
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
```

## License

ISC
