<<<<<<< HEAD
# ImpactCircle

> **Verified Impact. Real Contribution.**

A gig-based volunteer management platform connecting volunteers, non-profit organizations, and CSR partners in Greater Moncton, NB.

## Stack

- **Backend:** Node.js + Express + Sequelize (MySQL)
- **Frontend:** HTML + CSS + Vanilla JS
- **Auth:** JWT (7-day tokens, role-based)
- **File Uploads:** Multer (PDF, JPG, PNG — 5 MB max)
- **Email:** Nodemailer

## User Roles

| Role | What they do |
|------|-------------|
| Volunteer | Register, apply for gigs, earn points & rewards |
| Organization | Post gigs, approve volunteers, verify task completion |
| CSR Partner | Sponsor rewards, track employee volunteering |
| Admin | Verify users, manage categories & rewards, resolve disputes |

## Core Business Rule

**Volunteer hours are NEVER self-reported.** Every hour requires explicit organizational approval before points are credited.

## Getting Started

```bash
cp .env.example .env   # fill in your values
npm install
npm run seed           # seed categories + admin user
npm run dev            # dev server → http://localhost:3000
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Production start |
| `npm run seed` | Seed database with categories and admin user |
| `npm test` | Run test suite |

