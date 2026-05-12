# API Reference

All endpoints are prefixed with `/api`. Authentication uses `Authorization: Bearer <token>`.

---

## Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register/volunteer` | — | Register a new volunteer |
| POST | `/register/org` | — | Register a new organization |
| POST | `/login` | — | Login, returns JWT |
| GET | `/me` | ✓ | Get current user info |
| POST | `/forgot-password` | — | Send reset email |
| POST | `/reset-password` | — | Reset password with token |

---

## Gigs — `/api/gigs`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | optional | List gigs with filters (timeOfDay, minHours, maxHours, category, search) |
| GET | `/:id` | — | Get gig details |
| GET | `/:id/my-application` | volunteer | Check if current user has applied |
| POST | `/` | org | Create gig (supports recurrence fields) |
| PUT | `/:id` | org | Update gig |
| DELETE | `/:id` | org | Archive gig (sets status=cancelled) |
| POST | `/:id/apply` | volunteer | Apply to a gig |
| GET | `/:id/applications` | org | List applicants (includes VolunteerProfile) |
| GET | `/applications/:appId` | org | Get single application with profile |
| PATCH | `/applications/:appId/decide` | org | Approve or reject an application |

---

## Tasks — `/api/tasks`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/:id/start` | volunteer | Move task to inProgress |
| PATCH | `/:id/complete` | volunteer | Claim hours (moves to completed) |
| PATCH | `/:id/verify` | org | Approve or reject task completion |
| PATCH | `/:id/rate` | org | Rate volunteer (1–5 stars + feedback) |

---

## Admin — `/api/admin`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/verifications` | admin | List users pending verification |
| PATCH | `/verify/:userId` | admin | Approve or reject user account |
| GET | `/users` | admin | List all users |
| GET | `/users/:id` | admin | Get user with profile |
| PATCH | `/users/:id/block` | admin | Toggle isBlocked |
| DELETE | `/users/:id` | admin | Soft-delete (block + reject) |
| GET | `/organizations` | admin | List all organizations |
| GET | `/organizations/:id` | admin | Get org details |
| PUT | `/organizations/:id` | admin | Update org fields |
| DELETE | `/organizations/:id` | admin | Soft-delete org account |

---

## Organizations — `/api/orgs`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | org | Get own org profile |
| PUT | `/me` | org | Update own org profile |
| GET | `/me/dashboard` | org | Dashboard stats, gigs, pending tasks |
| GET | `/me/volunteers` | org | List volunteers with sessions and hours |
