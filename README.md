# ImpactCircle — Volunteer Management Platform

ImpactCircle connects volunteers with nonprofit organizations in the Greater Moncton area. Volunteers browse opportunities, track hours, and earn rewards. Organizations post gigs, manage applicants, and track volunteer attendance. Admins oversee verification, users, and platform health.

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: MySQL + Sequelize ORM
- **Auth**: JWT (JSON Web Tokens)
- **Email**: Nodemailer
- **Frontend**: Vanilla HTML/CSS/JS (no framework)

## Quick Start

```bash
npm install
cp .env.example .env   # fill in your values
npm run dev
```

## Roles

| Role | Description |
|------|-------------|
| `volunteer` | Browse gigs, apply, track hours, earn rewards |
| `org` | Post gigs, review applicants, approve hours, rate volunteers |
| `admin` | Verify accounts, manage users/orgs, view platform analytics |
| `csr` | Corporate social responsibility partner — sponsor rewards |

## Project Structure

```
src/
  config/      Database connection
  middleware/  Auth, validation, audit log, error handler
  models/      Sequelize models (User, Gig, Task, Application, …)
  routes/      Express route handlers
  services/    Email, notifications, points, auto-approval
public/
  css/         Global styles
  js/          Shared scripts (api.js, nav.js, footer.js)
  pages/       HTML pages for every view
```

## Environment Variables

See `.env.example` for all required variables.
