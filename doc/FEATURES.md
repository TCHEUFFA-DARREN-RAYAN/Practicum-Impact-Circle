# Feature Overview

## Volunteer Features

- **Account registration & verification** — upload gov ID and background check documents; admin approves
- **Gig browsing** — filter by category, time of day (morning/afternoon/evening), hours commitment, and location
- **Gig application** — personal statement; apply button greys out after submitting showing "Waiting for Approval"
- **Dashboard** — live stats (verified hours, gigs applied, completed), active task list with status badges
- **Task workflow** — Start Task → Claim Hours → awaiting org approval → approved/rejected
- **Points & rewards** — earn points per verified hour; redeem for rewards from sponsor partners
- **Hour tracking** — breakdown by cause category

## Organization Features

- **Gig creation** — title, description, category, dates, location, required skills, verified-only flag
- **Recurring gigs** — daily / weekly (with specific days) / monthly frequency; time of day (morning/afternoon/evening/custom); hours per session with auto-calculated totals
- **Applicant management** — modal with applicant list; "View Full Details" opens dedicated page with volunteer profile, skills, history, and personal statement
- **Task verification** — approve or reject hour claims; star rating (1–5) + optional feedback after approving
- **Gig archiving** — soft-delete (status=cancelled); data preserved in database
- **Volunteer Tracker** — table of all volunteers with session count, total hours, last active date; filter by Active Now / Recurring / All

## Admin Features

- **Verification queue** — approve or reject volunteer and org accounts; rejection reason is optional
- **User management** — view profile, block/unblock login, soft-delete (block + reject)
- **Organization management** — view details, edit fields, soft-delete linked user account
- **Platform analytics** — total users, gigs, hours facilitated, application stats
- **Category management** — create, edit, archive impact categories with colors and icons
- **Reward management** — create and retire rewards tied to categories

## Security & Access Control

- JWT authentication on all protected routes
- Role-based access: volunteer / org / admin / csr
- `isBlocked` flag checked on every authenticated request — blocked users get 401 immediately
- Admin accounts cannot be blocked or deleted via the admin UI
- Soft-deletes preserve all historical data for reporting
