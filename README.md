# Mini Online Test App (MERN)

A small online test app: students sign up, take a 10-question timed MCQ test, see their results, and review past attempts.

**Live app:** <paste your Render link here>
**Stack:** MongoDB (Atlas), Express, React (Vite), Node.js

## Features
- Sign up / log in with email and password (bcrypt-hashed, JWT sessions)
- 10 random MCQs loaded from MongoDB (12 sample questions are seeded on first run)
- 10-minute countdown that auto-submits at 00:00. The timer starts on the server, so refreshing the page does not reset it
- Correct answers are never sent to the browser during the test; grading happens on the server
- Result page: score, right/wrong per question, and the correct answers
- History page: all past attempts with scores and dates, each one reopenable
- Admin (bonus): a page to add new questions

## Run locally
Requires Node 18+ and a MongoDB connection string (a free MongoDB Atlas cluster works).

```bash
git clone <your-repo-url> && cd mini-test-app
cp server/.env.example server/.env      # then fill in MONGO_URI, JWT_SECRET, ADMIN_EMAIL
npm install --prefix server && npm install --prefix client
npm run dev:server                      # terminal 1: API on http://localhost:5000
npm run dev:client                      # terminal 2: app on http://localhost:5173
```

## Deploy (single Render web service)
Express serves the built React app, so one service gives one live link.
1. Create a free MongoDB Atlas cluster. Add a database user, and under Network Access allow `0.0.0.0/0`.
2. Push this repo to GitHub.
3. On Render: New > Web Service > connect the repo. Build command: `npm run build`. Start command: `npm start`.
4. Add environment variables: `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`.

## Admin access
Sign up with the email set in `ADMIN_EMAIL`. That account gets an **Add question** link in the header.

## API
| Method | Route | Purpose |
|---|---|---|
| POST | /api/auth/signup, /api/auth/login | Create account / log in |
| POST | /api/tests/start | Start (or resume) a test, returns 10 questions without answers |
| POST | /api/tests/:id/submit | Submit answers, returns graded result |
| GET | /api/tests/attempts | History of past attempts |
| GET | /api/tests/attempts/:id | Full review of one attempt |
| POST | /api/admin/questions | Add a question (admin only) |
