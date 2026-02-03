# Player Pro

A music education platform with teacher and student management, practice tracking, and lesson scheduling.

## Project Structure

```
player-pro/
├── backend/          # Express.js API server
├── frontend/         # React frontend application
└── README.md         # This file
```

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Render account (for deployment)

## Local Development Setup

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your database credentials and JWT secret.

5. Run database migrations:
```bash
npm run migrate
```

6. Start the development server:
```bash
npm run dev
```

The backend API will be available at `http://localhost:3000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Update `.env` with your API URL:
```
VITE_API_URL=http://localhost:3000
```

5. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Deployment to Render

### Backend Deployment

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the following:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`

4. Add environment variables:
   - `NODE_ENV=production`
   - `DATABASE_URL` (from PostgreSQL database)
   - `JWT_SECRET` (generate a strong secret)
   - `FRONTEND_URL` (your frontend URL)
   - `JWT_EXPIRES_IN=7d`

5. Create a PostgreSQL database on Render and use its connection string for `DATABASE_URL`

6. After deployment, run migrations:
   - SSH into the service or use Render's shell
   - Run: `npm run migrate`

### Frontend Deployment

1. Create a new Static Site on Render
2. Connect your GitHub repository
3. Set the following:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. Add environment variable:
   - `VITE_API_URL` (your backend API URL)

### Database Setup

1. Create a PostgreSQL database on Render
2. Note the connection string
3. Use it in your backend environment variables
4. Run migrations after first deployment

## API Documentation

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update current user
- `POST /api/auth/logout` - Logout

### Entities

All entity endpoints follow RESTful conventions:
- `GET /api/{entity}` - List entities
- `GET /api/{entity}/:id` - Get entity by ID
- `POST /api/{entity}` - Create entity
- `PUT /api/{entity}/:id` - Update entity
- `DELETE /api/{entity}/:id` - Delete entity
- `POST /api/{entity}/filter` - Filter entities

Available entities:
- `tasks` - Student tasks
- `lessons/schedules` - Lesson schedules
- `lessons/history` - Lesson history
- `recordings` - Audio recordings
- `practice/sessions` - Practice sessions
- `practice/routines` - Practice routines
- `materials` - Learning materials
- `recommendations` - Recommendations
- `chat` - Chat messages
- `announcements` - Announcements
- `users` - User management

### Functions

- `POST /api/functions/redeemTeacherSerial` - Redeem teacher activation code
- `POST /api/functions/generateTeacherSerials` - Generate teacher serials (admin only)
- `POST /api/functions/generateTeacherInviteCode` - Generate student invite code
- `POST /api/functions/linkStudentToTeacher` - Link student to teacher
- `POST /api/functions/updateTeacherStatus` - Update teacher status (admin only)

## Features

- User authentication and authorization
- Teacher and student role management
- Lesson scheduling and history
- Practice session tracking
- Audio recording management
- Material assignment and management
- Chat messaging between teachers and students
- Task management
- Recommendations system
- Announcements

## Technology Stack

### Backend
- Express.js
- PostgreSQL
- JWT authentication
- bcryptjs for password hashing

### Frontend
- React 18
- Vite
- React Router
- TanStack Query
- Radix UI components
- Tailwind CSS

## License

ISC
# Playerpro
