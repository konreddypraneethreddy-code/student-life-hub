# Student Life Hub

## 1. Requirements
Node.js 18+ (https://nodejs.org) and MySQL 8+ (https://dev.mysql.com/downloads/).

## 2. Setup
```
cd student-life-hub
npm install
cp .env.example .env        # Windows: copy .env.example .env
```
Edit `.env` and set `DB_PASSWORD` (your MySQL root password) and a long `JWT_SECRET`.
Make sure MySQL is running, then create tables + demo data (this runs `database/schema.sql` for you):
```
npm run seed
```
(Or import manually: `mysql -u root -p < database/schema.sql`, but then demo users won't exist - use `npm run seed`.)

## 3. Run
```
npm start
```
Open http://localhost:3000 (backend API and frontend are served together).

## Demo logins
- Student: student@hub.com / Student@123
- Admin: admin@hub.com / Admin@123
Admins see Add/Edit/Delete buttons on every content page plus an Admin Dashboard (stats, student block/delete).

## Structure
frontend/ (index.html, css/, js/app.js) - backend/ (server.js, seed.js) - database/schema.sql
