<div align="center">

# 🚀 TeamFlow Hub - Backend API

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![Express](https://img.shields.io/badge/Express-4.x-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-6.x-brightgreen)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black)
![JWT](https://img.shields.io/badge/JWT-Auth-orange)

**A comprehensive Task Management System with role-based access control and real-time notifications**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [API Documentation](#-api-documentation) • [Postman Collection](#-postman-collection) • [Real-time Events](#-real-time-events)

</div>

---

## 📋 Overview

**TeamFlow Hub** is a robust backend API for managing teams, tasks, and workflows with three distinct user roles. Built with **Node.js**, **Express**, and **MongoDB**, it provides a complete RESTful API with JWT authentication and real-time notifications via Socket.IO.

### 👥 User Roles

- **Manager**: Creates teams, assigns high-level tasks, manages users
- **Team Lead**: Breaks down tasks into subtasks, assigns to developers, manages team members
- **Developer**: Works on assigned tasks, updates status

---

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- User approval system (pending → approved → rejected)
- Password change with token invalidation
- Secure password hashing with bcrypt

### 👤 User Management
- User registration with approval workflow
- Profile management with image upload
- User status management (approve/reject)
- Role assignment (manager, team-lead, developer)
- User filtering and search

### 👥 Team Management
- Create and manage teams
- Assign team leads
- Add/remove team members
- Change team leadership
- Team-based task filtering

### 📝 Task Management
- **Parent Tasks**: High-level tasks created by managers
- **Sub Tasks**: Detailed tasks assigned by team leads to developers
- Status tracking: `todo` → `in-progress` → `done`
- Priority levels: low, medium, high
- Task filtering by status, priority, team, and assignment
- Soft delete functionality

### 🔔 Real-time Notifications
- Socket.IO integration for instant updates
- Notification types:
  - `newTask`: Manager creates a task (sent to Team Lead)
  - `taskAssigned`: Team Lead assigns subtask (sent to Developer)
  - `taskCompleted`: Developer completes task (sent to Creator)
- Real-time dashboard updates
- Unread notification counter

### 📊 Dashboard Analytics
- Role-specific dashboards with key metrics
- **Manager Dashboard**: Teams count, total tasks, completed tasks
- **Team Lead Dashboard**: Team-specific task metrics
- **Developer Dashboard**: Personal task breakdown (total, done, pending)

---

## 🛠️ Tech Stack

### Core Technologies
- **Runtime**: Node.js 18.x
- **Framework**: Express.js 4.x
- **Database**: MongoDB 6.x with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT)
- **Real-time**: Socket.IO 4.x

### Key Libraries
- **bcryptjs**: Password hashing
- **express-async-handler**: Async error handling
- **express-validator**: Request validation
- **multer**: File upload handling
- **sharp**: Image processing
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment configuration

---

## 📁 Project Structure

```
TeamFlow-Hub/
├── models/
│   ├── user.model.js           # User schema
│   ├── team.model.js           # Team schema
│   ├── task.model.js           # Task schema
│   └── notification.model.js   # Notification schema
├── routes/
│   ├── auth.routes.js          # Authentication endpoints
│   ├── user.routes.js          # User management endpoints
│   ├── team.routes.js          # Team management endpoints
│   ├── task.routes.js          # Task management endpoints
│   ├── dashboard.routes.js     # Dashboard endpoints
│   └── notification.routes.js  # Notification endpoints
├── services/
│   ├── auth.service.js         # Auth business logic
│   ├── user.service.js         # User business logic
│   ├── team.service.js         # Team business logic
│   ├── task.service.js         # Task business logic
│   ├── dashboard.service.js    # Dashboard business logic
│   └── notification.service.js # Notification business logic
├── validators/
│   ├── auth.validator.js       # Auth validation rules
│   ├── user.validator.js       # User validation rules
│   ├── team.validator.js       # Team validation rules
│   └── task.validator.js       # Task validation rules
├── middlewares/
│   └── uploadImageMiddleware.js # File upload handling
├── utils/
│   ├── apiError.js             # Custom error class
│   └── createNotification.js   # Notification helper
└── server.js                    # Entry point
```

---

## 🚀 Installation

### Prerequisites
- Node.js 18.x or higher
- MongoDB 6.x or higher
- npm or yarn

### Setup Steps

1. **Clone the repository**
```bash
git clone https://github.com/mahmoud-atta1/TeamFlow-Hub.git
cd TeamFlow-Hub
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
BASE_URL=http://localhost:5000

# Database
MONGODB_URI=mongodb://localhost:27017/teamflow-hub

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# File Upload
MAX_FILE_SIZE=5000000
```

4. **Start MongoDB**
```bash
# Make sure MongoDB is running
mongod
```

5. **Run the server**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

6. **Server should be running at**
```
http://localhost:5000
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 🔐 Authentication Endpoints

### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201)**
```json
{
  "success": true,
  "message": "Account created and waiting for approval",
  "data": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "developer",
    "status": "pending"
  }
}
```

### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200)**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "developer",
    "status": "approved"
  }
}
```

### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

---

## 👤 User Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/users/profile` | All authenticated | Get current user profile |
| PATCH | `/users/update-profile` | All authenticated | Update profile (with image) |
| PATCH | `/users/change-password` | All authenticated | Change password |
| GET | `/users` | Manager | Get all users (with filters) |
| GET | `/users/:id` | Manager, Team Lead | Get user by ID |
| PATCH | `/users/:id` | Manager | Update user (role, status) |
| DELETE | `/users/:id` | Manager | Delete user |

---

## 👥 Team Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/teams` | Manager | Create team |
| GET | `/teams` | All authenticated | Get teams (filtered by role) |
| PATCH | `/teams/:id` | Manager | Rename team |
| PATCH | `/teams/:id/add-member` | Manager, Team Lead | Add member to team |
| PATCH | `/teams/:id/remove-member` | Manager, Team Lead | Remove member from team |
| PATCH | `/teams/:id/change-lead` | Manager | Change team lead |
| DELETE | `/teams/:id` | Manager | Delete team (soft delete) |

---

## 📝 Task Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/tasks` | Manager | Create parent task |
| POST | `/tasks/sub-task` | Team Lead | Create subtask (assign to developer) |
| GET | `/tasks` | All authenticated | Get tasks (filtered by role) |
| GET | `/tasks/:id` | All authenticated | Get task by ID |
| PATCH | `/tasks/:id` | Manager, Team Lead | Update task details |
| PATCH | `/tasks/:id/status` | Team Lead, Developer | Update task status |
| DELETE | `/tasks/:id` | Manager, Team Lead | Delete task (soft delete) |

### Task Status Flow
```
todo → in-progress → done
```
- Cannot skip statuses
- Cannot revert once marked as "done"

---

## 📊 Dashboard Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/dashboard/manager` | Manager | Get manager dashboard metrics |
| GET | `/dashboard/team` | Team Lead | Get team lead dashboard metrics |
| GET | `/dashboard/me` | Developer | Get developer dashboard metrics |

---

## 🔔 Notification Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/notifications/me` | All authenticated | Get my notifications |
| GET | `/notifications/unread-count` | All authenticated | Get unread count |
| PATCH | `/notifications/:id/read` | All authenticated | Mark as read |
| PATCH | `/notifications/read-all` | All authenticated | Mark all as read |

---

## 🔄 Real-time Events

### Socket.IO Connection
```javascript
const socket = io('http://localhost:5000');
socket.emit('join', { userId: currentUser._id });
```

### Events Emitted by Server

| Event | Description | Payload |
|-------|-------------|---------|
| `newNotification` | New notification created | `{ _id, userId, type, referenceId, isRead }` |
| `dashboardUpdate` | Dashboard needs refresh | `null` |
| `taskCreated` | New task created (to Team Lead) | `{ _id, title, priority }` |
| `taskAssigned` | Task assigned (to Developer) | `{ _id, title, priority }` |
| `taskCompleted` | Task completed (to Creator) | `{ _id, title }` |

---

## 📦 Database Models

### User Schema
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: "manager" | "team-lead" | "developer",
  teamId: ObjectId (ref: Team),
  profileImg: String,
  status: "pending" | "approved" | "rejected",
  isActive: Boolean,
  passwordChangedAt: Date
}
```

### Team Schema
```javascript
{
  name: String,
  managerId: ObjectId (ref: User),
  teamLead: ObjectId (ref: User),
  teamMembers: [ObjectId] (ref: User),
  isActive: Boolean
}
```

### Task Schema
```javascript
{
  title: String,
  description: String,
  status: "todo" | "in-progress" | "done",
  priority: "low" | "medium" | "high",
  createdBy: ObjectId (ref: User),
  assignedTo: ObjectId (ref: User),
  teamId: ObjectId (ref: Team),
  parentTaskId: ObjectId (ref: Task),
  isActive: Boolean
}
```

### Notification Schema
```javascript
{
  userId: ObjectId (ref: User),
  type: "newTask" | "taskAssigned" | "taskCompleted",
  referenceId: ObjectId (ref: Task),
  isRead: Boolean
}
```

---

## 🎯 Key Features Explained

### 1. User Approval System
- New users register with `status: "pending"`
- Managers can approve or reject users
- Only approved users can login
- Rejected users receive appropriate error message

### 2. Task Hierarchy
- **Parent Tasks**: Created by managers, no initial assignment
- **Sub Tasks**: Created by team leads, assigned to specific developers
- Team leads can only assign tasks to approved developers in their team
- Cannot assign tasks to managers

### 3. Role-Based Access Control
- Each endpoint checks user role via middleware
- Data filtering based on user role
- Managers see all data
- Team leads see only their team's data
- Developers see only their assigned tasks

### 4. Real-time Notifications
- Socket.IO rooms based on userId
- Notifications sent instantly to relevant users
- Dashboard auto-updates on data changes
- Unread counter updates in real-time

---

## 📮 Postman Collection

Complete API documentation and testing collection available on Postman:

[![Run in Postman](https://run.pstmn.io/button.svg)](https://documenter.getpostman.com/view/51642188/2sBXcGEfea)

**Postman Documentation**: [View Full API Docs](https://documenter.getpostman.com/view/51642188/2sBXcGEfea)

This collection includes:
- ✅ All API endpoints with examples
- ✅ Pre-configured environment variables
- ✅ Request/Response examples
- ✅ Authentication setup
- ✅ Ready-to-use test requests

---

## 🧪 Testing

### Using Postman/Insomnia

1. **Register a user**
```
POST /api/v1/auth/register
```

2. **Login as manager** (create a manager manually in DB for first time)
```
POST /api/v1/auth/login
```

3. **Approve the registered user**
```
PATCH /api/v1/users/:userId
Body: { "status": "approved" }
```

4. **Create a team**
```
POST /api/v1/teams
Body: { "name": "Frontend Team", "teamLead": "userId" }
```

5. **Create a task**
```
POST /api/v1/tasks
Body: { "title": "Build Dashboard", "teamId": "teamId", "priority": "high" }
```

---

## 🎨 Frontend

> **Note**: The frontend for this project was built with basic knowledge of HTML, CSS, and JavaScript, enhanced with AI assistance. It provides a functional interface to interact with this backend API.

**Frontend Technologies**: HTML5, CSS3, Vanilla JavaScript, Socket.IO Client

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 API Response  Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "results": 10  // For list endpoints
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400
}
```

---

## 🔒 Security Features

- ✅ JWT authentication with expiration
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Token invalidation on password change
- ✅ Role-based access control
- ✅ Input validation and sanitization
- ✅ Protected routes middleware
- ✅ Secure file upload handling
- ✅ CORS configuration

---

## 📈 Future Enhancements

- [ ] Email notifications for user approval
- [ ] Task comments and activity log
- [ ] File attachments for tasks
- [ ] Task deadlines and reminders
- [ ] Advanced analytics and reporting
- [ ] Team performance metrics
- [ ] Export data to CSV/Excel
- [ ] Two-factor authentication (2FA)
- [ ] Pagination for large datasets
- [ ] Search and advanced filtering

---

## 👨‍💻 Author

**Mahmoud Atta**

- GitHub: [@mahmoud-atta1](https://github.com/mahmoud-atta1)

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with ❤️ by Mahmoud Atta

</div>
