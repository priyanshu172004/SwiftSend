# File Sharing Platform

A full-stack file sharing platform built with React, Express, MySQL, and Sequelize. Users can upload files, create folders, and share them with other users or via public links.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Features](#features)
- [Database Models](#database-models)

## Tech Stack - Information

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **ORM**: Sequelize
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: ZOD
- **File Upload**: Multer
- **Password Hashing**: bcryptjs

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **HTTP Client**: Axios

## Project Structure

```
fileSharingPlatform/
├── server/                     # Backend API
│   ├── config/
│   │   └── database.js         # Sequelize database configuration
│   ├── controllers/
│   │   ├── authController.js   # Authentication logic
│   │   └── fileController.js  # File operations logic
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT authentication middleware
│   │   ├── reqLoggerMiddleware.js  # Request logging
│   │   └── uploadMiddleware.js # Multer file upload config
│   ├── models/
│   │   ├── index.js           # Model associations
│   │   ├── User.js            # User model
│   │   ├── FileItem.js        # File/Folder model
│   │   └── FileShare.js       # File sharing model
│   ├── routes/
│   │   ├── authRoutes.js      # Authentication routes
│   │   ├── fileRoutes.js      # File operations routes
│   │   └── userRoutes.js      # User search routes
│   ├── validations/
│   │   ├── authValidation.js  # ZOD validation schemas
│   │   └── fileValidation.js  # File validation schemas
│   ├── uploads/               # Local file storage
│   ├── .env                  # Environment variables
│   ├── .env.example          # Environment template
│   ├── package.json
│   └── server.js             # Entry point
│
├── client/                    # Frontend React app
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Auth state management
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── PublicShare.jsx
│   │   ├── services/
│   │   │   └── api.js        # API service
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── README.md
```

## Prerequisites

- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/kunalbhatia2601/File-Sharing
cd File-Sharing
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../client
npm install
```

## Configuration

### 1. Configure Backend Environment Variables

Copy the example environment file and update it with your settings:

```bash
cd server
cp .env.example .env
```

Edit `.env` with your database and application settings:

```env
# Server
PORT=2100
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=file_sharing_platform
DB_USER=root
DB_PASSWORD=your_password_here

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRE=7d

# Storage (local or cloudinary)
STORAGE_TYPE=local

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# File Upload
MAX_FILE_SIZE=104857600
```

### 2. Create Database

Create a MySQL database:

```sql
CREATE DATABASE file_sharing_platform;
```

## Running the Application

### 1. Start the Backend Server

```bash
cd server
npm run dev
```

The server will start on `http://localhost:2100`. It will automatically sync the database models on startup.

### 2. Start the Frontend Development Server

```bash
cd client
npm run dev
```

The frontend will start on `http://localhost:5173`.

### 3. Production Build

For the frontend:

```bash
cd client
npm run build
```

The built files will be in the `client/dist` directory.

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Login user | No |
| GET | `/api/auth/me` | Get current user | Yes |

### Files & Folders

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/files` | List files in folder | Yes |
| POST | `/api/files/upload` | Upload a file | Yes |
| POST | `/api/files/folder` | Create a folder | Yes |
| GET | `/api/files/:id` | Get file/folder details | Yes |
| GET | `/api/files/:id/contents` | Get folder contents | Yes |
| GET | `/api/files/download/:id` | Download a file | Yes |
| PATCH | `/api/files/:id` | Rename file/folder | Yes |
| DELETE | `/api/files/:id` | Delete file/folder | Yes |

### Sharing

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/files/:id/share` | Share with users | Yes |
| DELETE | `/api/files/:id/share/:userId` | Remove share | Yes |
| POST | `/api/files/:id/public` | Toggle public link | Yes |
| GET | `/api/files/public/:token` | Access via public link | No |

### Users

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users/search?q=query` | Search users | Yes |

## Features

### Authentication
- User registration with name, email, password
- JWT-based authentication
- Password hashing with bcrypt
- Protected routes

### File Management
- Upload files with size limit (default 100MB)
- Create nested folder structure
- Rename files and folders
- Delete files and folders (recursive deletion for folders)
- Download files

### Folder Navigation
- Route-based navigation (e.g., `/dashboard/folder/:id`)
- Breadcrumb navigation
- View files owned by user
- View files shared with user

### Sharing
- Share files/folders with specific users
- Permission level: read-only
- Toggle public link sharing
- Access public files via unique token
- Nested folder access (if parent folder is shared, all contents are accessible)

### Storage
- Local file storage (default)
- Cloudinary storage support (optional)

## Database Models

### User
| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER | Primary key |
| name | STRING | User's full name |
| email | STRING | User's email (unique) |
| password | STRING | Hashed password |
| role | ENUM | 'user' or 'admin' |
| isActive | BOOLEAN | Account status |
| createdAt | TIMESTAMP | Creation date |
| updatedAt | TIMESTAMP | Last update |

### FileItem
| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER | Primary key |
| name | STRING | File/folder name |
| type | ENUM | 'file' or 'folder' |
| parentId | INTEGER | Parent folder ID (null for root) |
| ownerId | INTEGER | Owner user ID |
| path | STRING | Full path |
| mimeType | STRING | File MIME type |
| size | BIGINT | File size in bytes |
| storageKey | STRING | Cloudinary URL (if using cloud) |
| storageType | ENUM | 'local' or 'cloudinary' |
| localPath | STRING | Local file path |
| isPublic | BOOLEAN | Public link enabled |
| shareToken | STRING | Unique token for public access |
| createdAt | TIMESTAMP | Creation date |
| updatedAt | TIMESTAMP | Last update |

### FileShare
| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER | Primary key |
| fileItemId | INTEGER | FileItem ID |
| userId | INTEGER | User ID (shared with) |
| permission | ENUM | 'read' |
| sharedById | INTEGER | User ID (who shared) |
| createdAt | TIMESTAMP | Creation date |
