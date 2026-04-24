# Copilot Instructions

- This repository is a split frontend/backend project. There is no root-level npm app; use the subdirectories directly.
- Backend service lives in `backend/` and frontend app lives in `Front-end/`.

## Important workflows
- Backend dev server: `cd backend && npm install && npm run dev`
- Frontend dev server: `cd Front-end && npm install && npm run dev`
- Frontend lint command: `cd Front-end && npm run lint`
- There is no backend test suite or root-level monorepo runner defined.

## Backend architecture
- Entry point: `backend/index.js`
- API route base: `app.use('/api/auth', authRoutes)` from `backend/route/auth/auth-routes.js`
- Controller logic: `backend/controllers/auth/auth-controller.js`
- MongoDB connection: `backend/db/connectDB.js` uses `process.env.MONGO_URI`
- User schema: `backend/model/user.js`
- Authentication uses cookie-based JWT stored under `token` and verified in `authMiddleware`
- JWT secret is currently hardcoded as `CLIENT_SECRET_KEY` in `auth-controller.js`.

## Frontend architecture
- Entry point: `Front-end/src/main.jsx`
- Routing uses `react-router-dom` v6 with nested routes and lazy-loading.
- Auth state is managed in `Front-end/src/contexts/User.jsx`.
- Protected pages use `Front-end/src/components/ProtectedRoute.jsx` and redirect unauthenticated users to `/login`.
- Auth endpoints are hardcoded to `http://localhost:5020/api/auth/...` in `Front-end/src/contexts/User.jsx`.

## Integration details
- Frontend requests use `axios` and `withCredentials: true` for cookie auth.
- The frontend expects the backend on port `5020` and the Vite app on `5173`.
- `backend/index.js` allows CORS origin `http://localhost:5173`.
- API responses are expected in form `{ success: boolean, message: string, user?: {...} }`.

## Project-specific conventions
- `userType` is an enum: `professional` or `employer`.
- Employer records require `compName`; professionals do not.
- Add new backend endpoints under `backend/route/*` and put logic in `backend/controllers/*`.
- Add new frontend routes in `Front-end/src/main.jsx` and keep page components under `Front-end/src/Pages/`.

## What to avoid
- Don’t assume a single root package script for both services.
- Don’t change auth behavior without updating both the backend JWT logic and the frontend `User` context.
- Don’t rely on environment-based frontend API URLing; the app currently uses hardcoded `localhost:5020` endpoints.
