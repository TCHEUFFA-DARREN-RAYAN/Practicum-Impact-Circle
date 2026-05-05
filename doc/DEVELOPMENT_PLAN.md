# ImpactCircle — Complete Development Plan
## A Verified Volunteer, CSR & Community Impact Exchange Platform

> Stack: Node.js · Express · MongoDB (Mongoose) · HTML · CSS · Vanilla JS  
> Target: Production-ready MVP deployed to Railway / Render / Fly.io

---

## WHAT THIS PLATFORM IS

ImpactCircle is a gig-based volunteer management platform that connects:
- **Volunteers** — register, get verified, apply for gigs, earn points & rewards
- **Non-Profit Organizations** — post gigs, select volunteers, verify task completion
- **CSR / Private Sector Partners** — sponsor rewards, track employee volunteering
- **Platform Administrators** — verify users, manage rewards, resolve disputes

Core rule: **Hours are NEVER self-reported.** Every hour requires explicit org approval.

---

## FOLDER / PROJECT STRUCTURE

```
impactcircle/
├── doc/                        ← this file lives here
│   └── DEVELOPMENT_PLAN.md
├── src/
│   ├── config/
│   │   └── db.js               ← MongoDB connection
│   ├── middleware/
│   │   ├── auth.js             ← JWT verify, requireAuth, requireRole
│   │   └── auditLog.js         ← global audit log Express middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── VolunteerProfile.js
│   │   ├── Organization.js
│   │   ├── Category.js
│   │   ├── Gig.js
│   │   ├── Application.js
│   │   ├── Task.js
│   │   ├── HourRecord.js
│   │   ├── Points.js
│   │   ├── Reward.js
│   │   ├── Redemption.js
│   │   ├── Notification.js
│   │   └── AuditLog.js
│   ├── routes/
│   │   ├── auth.js             ← POST /auth/register, POST /auth/login
│   │   ├── volunteers.js       ← GET/PUT /volunteers/me, GET /volunteers/me/dashboard
│   │   ├── organizations.js    ← org profile, gig management
│   │   ├── gigs.js             ← gig listing, detail, apply
│   │   ├── tasks.js            ← task complete, verify
│   │   ├── rewards.js          ← catalogue, redeem
│   │   ├── notifications.js    ← GET /notifications, mark read
│   │   ├── admin.js            ← admin panel routes
│   │   ├── csr.js              ← CSR dashboard & CSV export
│   │   └── public.js           ← GET /public/impact (no auth)
│   ├── services/
│   │   ├── email.js            ← sendEmail(to, subject, body) via Nodemailer
│   │   ├── points.js           ← awardPoints(), checkEligibility()
│   │   └── autoApproval.js     ← cron job — 30-day auto-approve
│   ├── uploads/                ← multer destination (documents)
│   ├── public/                 ← static frontend
│   │   ├── css/
│   │   │   └── base.css        ← CSS variables, reset, typography, buttons, forms
│   │   ├── js/
│   │   │   ├── auth.js
│   │   │   ├── volunteer-register.js
│   │   │   ├── volunteer-dashboard.js
│   │   │   ├── gigs.js
│   │   │   ├── rewards.js
│   │   │   ├── org-dashboard.js
│   │   │   ├── admin.js
│   │   │   ├── csr.js
│   │   │   ├── public-dashboard.js
│   │   │   └── notifications.js
│   │   └── pages/
│   │       ├── index.html               ← landing / public impact dashboard
│   │       ├── login.html               ← login for all 4 roles
│   │       ├── register-volunteer.html  ← 5-step registration
│   │       ├── register-org.html        ← org registration
│   │       ├── register-csr.html        ← CSR registration
│   │       ├── volunteer-profile.html   ← profile + document upload + badge
│   │       ├── volunteer-dashboard.html ← hours, points, gig history, rewards
│   │       ├── gig-list.html            ← browse gigs with filters
│   │       ├── gig-detail.html          ← single gig + apply
│   │       ├── rewards.html             ← reward catalogue + redeem
│   │       ├── org-dashboard.html       ← org gigs, applicants, task verification
│   │       ├── org-gig-create.html      ← create new gig
│   │       ├── admin-dashboard.html     ← admin home
│   │       ├── admin-verify.html        ← verification queue
│   │       ├── admin-categories.html    ← category management
│   │       ├── admin-rewards.html       ← reward catalogue management
│   │       ├── admin-disputes.html      ← escalation queue
│   │       ├── admin-audit.html         ← audit log viewer
│   │       ├── admin-analytics.html     ← platform KPIs
│   │       └── csr-dashboard.html       ← CSR private dashboard
│   └── seed/
│       └── seed.js             ← seed categories, admin user, sample data
├── tests/
│   ├── auth.test.js
│   ├── volunteer.test.js
│   ├── gig.test.js
│   ├── task.test.js
│   ├── points.test.js
│   ├── rewards.test.js
│   ├── admin.test.js
│   └── public.test.js
├── .env.example
├── .gitignore
├── package.json
└── server.js                   ← Express app entry point
```

---

## DATABASE SCHEMA (MongoDB / Mongoose)

### User
```
_id, email, passwordHash, role (volunteer|org|admin|csr),
verificationStatus (pending|verified|rejected), rejectionReason,
createdAt, updatedAt
```

### VolunteerProfile
```
userId (ref User), firstName, lastName, phone, dateOfBirth, address,
skills[], interests[], languages[], weeklyAvailabilityHours, weeklyAvailabilityDays[],
previousVolunteeringHistory, preferredCategories[], references[],
documents: { govId, backgroundCheck, references[] },
totalVerifiedHours, totalPoints, categoryHours: { categoryId: hours },
badges[], registrationStep (1-5), consentGiven, createdAt
```

### Organization
```
userId (ref User), orgName, missionStatement, categories[],
contactName, contactEmail, contactPhone, address,
verificationStatus, rejectionReason, publicProfile, createdAt
```

### Category
```
_id, name, description, pointsPerHour, isActive, createdAt
(8 seeded: Food Security, Women Support, Youth Development,
Seniors Support, Environment, Education, Newcomer Integration,
Volunteer Opportunities)
```

### Gig
```
_id, orgId (ref Organization), title, description, categoryId (ref Category),
startDate, endDate, estimatedHours, location { type, address },
requiredSkills[], verifiedOnly (bool), status (open|closed|cancelled),
applicantCount, createdAt
```

### Application
```
_id, gigId (ref Gig), volunteerId (ref User), personalStatement,
status (pending|approved|rejected), decisionReason, decidedAt, createdAt
```

### Task
```
_id, applicationId (ref Application), gigId, volunteerId, orgId,
status (open|applied|accepted|inProgress|completed|approved|rejected),
completedAt, verifiedAt, autoApprovedAt, rejectionReason,
hoursLogged, submittedAt, createdAt
```

### HourRecord
```
_id, volunteerId, taskId, categoryId, hours, pointsAwarded,
approvedBy (orgId), approvedAt, createdAt
```

### Reward
```
_id, name, description, categoryId (ref Category), sponsorName,
sponsorId (ref User, optional), pointsRequired, categoryHoursRequired,
type (discount|eventPass|perk|badge|certificate),
isActive, isRetired, createdAt
```

### Redemption
```
_id, volunteerId, rewardId, pointsSpent, redeemedAt, status
```

### Notification
```
_id, userId, message, type, isRead, createdAt
```

### AuditLog
```
_id, eventType, actorId, actorRole, targetEntity, targetId,
metadata {}, timestamp  — NO delete allowed on this collection
```

---

## DEVELOPMENT STEPS (Ordered — Do These In Sequence)

---

### PHASE 0 — Project Bootstrap (Do First)

#### Step 0.1 — Init Node project
```bash
npm init -y
npm install express mongoose bcryptjs jsonwebtoken dotenv multer nodemailer
npm install node-cron cors helmet morgan express-validator
npm install --save-dev jest supertest nodemon
```

#### Step 0.2 — Create .env.example
```
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASS=your_app_password
NODE_ENV=development
```

#### Step 0.3 — server.js entry point
- Load dotenv
- Connect to MongoDB (src/config/db.js)
- Register global middleware: cors, helmet, morgan, express.json
- Register audit log middleware (after auth middleware is built)
- Mount all route files
- Serve static files from public/
- Start listening on PORT

#### Step 0.4 — package.json scripts
```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "test": "jest --runInBand",
  "seed": "node src/seed/seed.js"
}
```

#### Step 0.5 — .gitignore
```
node_modules/
.env
src/uploads/*
!src/uploads/.gitkeep
```

---

### PHASE 1 — Authentication & Registration

#### Step 1.1 — MongoDB Connection (src/config/db.js)
- mongoose.connect() with retry logic
- Log connected/failed to console

#### Step 1.2 — User Model (src/models/User.js)
- Fields: email, passwordHash, role, verificationStatus, rejectionReason
- Pre-save hook: hash password with bcrypt (salt rounds = 12)
- Instance method: comparePassword()

#### Step 1.3 — JWT Auth Middleware (src/middleware/auth.js)
- requireAuth: verify JWT from Authorization header → attach req.user
- requireRole(...roles): check req.user.role is in allowed list
- Return 401 for missing/invalid token, 403 for wrong role

#### Step 1.4 — Auth Routes (src/routes/auth.js)
- POST /auth/register → validate body, hash password, create User
- POST /auth/login → find user, comparePassword, issue JWT (7d expiry)
- Include role in JWT payload

#### Step 1.5 — Volunteer Multi-Step Registration (src/routes/volunteers.js)
- POST /volunteers/register/step/:step (1-5) → save partial progress to VolunteerProfile
  - Step 1: basic info (name, phone, dob, address)
  - Step 2: skills, interests, languages, availability
  - Step 3: history, preferredCategories, references
  - Step 4: document upload (handled by multer)
  - Step 5: consent confirmation → set verificationStatus=pending
- GET /volunteers/me → return full profile
- PUT /volunteers/me → update editable fields

#### Step 1.6 — Document Upload (multer)
- Accept: PDF, JPG, PNG (5MB max per file)
- Store in src/uploads/{userId}/
- Reject other file types with 400

#### Step 1.7 — Organization Registration (src/routes/organizations.js)
- POST /orgs/register → create User (role=org) + Organization record, status=pending
- GET /orgs/me → org profile
- PUT /orgs/me → edit org profile
- GET /orgs/:id → public org profile

#### Step 1.8 — CSR Registration (src/routes/csr.js)
- POST /csr/register → create User (role=csr) + CSR profile record

#### Step 1.9 — Admin Verification Workflow (src/routes/admin.js)
- All routes protected with requireRole('admin')
- GET /admin/verifications → list pending verifications (volunteers + orgs)
- PATCH /admin/verify/:userId → set verificationStatus to verified|rejected + reason
  - On status change: trigger sendEmail() + createNotification()
- GET /admin/users → list all users with status, role, date

#### Step 1.10 — Email Service (src/services/email.js)
- Configure Nodemailer transporter from .env
- Export: sendEmail(to, subject, htmlBody)
- Templates for: registration, verification outcome, application decision, task outcome

#### Step 1.11 — Category Seeding (src/seed/seed.js)
- Upsert 8 categories on startup (idempotent)
- Seed 1 admin user (from .env ADMIN_EMAIL / ADMIN_PASS)
- Optional: seed sample org, volunteer, gigs for demo

---

### PHASE 2 — Gig Lifecycle

#### Step 2.1 — Gig Model & Routes (src/routes/gigs.js)
- POST /gigs → org creates gig (requireRole('org'), must be verified)
- GET /gigs → list open gigs, supports query params: category, location, dateFrom, dateTo, org
- GET /gigs/:id → single gig detail
- PUT /gigs/:id → org edits own gig
- DELETE /gigs/:id → org cancels gig (status=cancelled)

#### Step 2.2 — Application Routes
- POST /gigs/:id/apply → volunteer applies (requireRole('volunteer'))
  - Check: volunteer is verified if gig.verifiedOnly=true
  - Check: volunteer not already applied
  - Create Application with status=pending
  - Notify org (email + in-app notification)
- GET /gigs/:id/applications → org views applicants for own gig
- PATCH /applications/:id/decide → org approves/rejects (requireRole('org'))
  - On approve: create Task record, status=accepted, notify volunteer
  - On reject: notify volunteer with reason

#### Step 2.3 — Task Status State Machine (src/routes/tasks.js)
Enforce exact flow: open → applied → accepted → inProgress → completed → approved|rejected
- PATCH /tasks/:id/start → volunteer sets inProgress
- PATCH /tasks/:id/complete → volunteer marks completed, timestamp, notify org
- PATCH /tasks/:id/verify → org approves or rejects
  - On approve: call awardPoints(), create HourRecord, notify volunteer
  - On reject: set status=rejected, reason, notify volunteer
  - Guard: only the task's assigned org can call this

#### Step 2.4 — Points Engine (src/services/points.js)
- awardPoints(volunteerId, taskId, categoryId, hours):
  1. Look up category.pointsPerHour
  2. Calculate points = hours × rate
  3. Update VolunteerProfile.totalPoints += points
  4. Update VolunteerProfile.categoryHours[categoryId] += hours
  5. Update VolunteerProfile.totalVerifiedHours += hours
  6. Create HourRecord
  7. createNotification(volunteerId, 'Points credited', 'points')
- checkEligibility(volunteerId, rewardId):
  - Return { eligible: bool, reason: string|null }
  - Must meet: totalPoints >= reward.pointsRequired
  - Must meet: categoryHours[reward.categoryId] >= reward.categoryHoursRequired

#### Step 2.5 — Reward Catalogue & Redemption (src/routes/rewards.js)
- GET /rewards → list active rewards with per-reward eligibility for logged-in volunteer
- POST /rewards/:id/redeem → requireRole('volunteer')
  - Call checkEligibility() → 400 if not eligible
  - Deduct points from volunteer balance
  - Create Redemption record
  - createNotification + sendEmail

#### Step 2.6 — 30-Day Auto-Approval Cron (src/services/autoApproval.js)
- Run daily at midnight
- Find all Tasks where status=completed AND submittedAt < (now - 30 days)
- Auto-approve each: awardPoints(), status=approved, notify org+volunteer
- Send reminder emails at Day 7, Day 15, Day 28 for still-pending tasks

#### Step 2.7 — Notification System (src/routes/notifications.js)
- createNotification(userId, message, type) utility — called by all services
- GET /notifications → return user's notifications, newest first
- PATCH /notifications/read → mark all as read (or by id)

---

### PHASE 3 — Dashboards & Admin Tools

#### Step 3.1 — Volunteer Dashboard API
- GET /volunteers/me/dashboard → aggregated:
  - totalVerifiedHours, totalPoints
  - categoryHours breakdown
  - gigHistory[] with status
  - badges[], eligible rewards[]

#### Step 3.2 — Org Dashboard API
- GET /orgs/me/dashboard → all gigs + applicant counts + pending task approvals

#### Step 3.3 — Public Impact Dashboard API (no auth)
- GET /public/impact → aggregate:
  - Total verified hours per category
  - Top 10 volunteers (weekly, monthly, all-time) by verifiedHours
  - Top 10 orgs by facilitated hours
  - Top CSR sponsors by sponsored rewards
- Cache result for 5 minutes (in-memory Map with TTL, no Redis needed for MVP)

#### Step 3.4 — CSR Dashboard API
- GET /csr/me/dashboard → employee hours, category breakdown, redemption stats
- GET /csr/me/report.csv → downloadable CSV of impact data

#### Step 3.5 — Admin Routes
- GET /admin/dashboard → platform KPIs: users, gigs, hours, auto-approval rate
- GET /admin/categories → list all categories
- POST /admin/categories → create category
- PUT /admin/categories/:id → edit
- PATCH /admin/categories/:id/archive → soft archive
- GET /admin/rewards → all rewards
- POST /admin/rewards → create reward
- PUT /admin/rewards/:id → edit
- PATCH /admin/rewards/:id/retire → soft retire (hidden but preserved)
- GET /admin/disputes → tasks with status=rejected escalated to admin
- PATCH /admin/disputes/:taskId/override → override status, mandatory reason, log to AuditLog
- GET /admin/audit → filter audit log by date, eventType, actorId
- GET /admin/analytics.csv → export platform stats

#### Step 3.6 — Audit Log Middleware (src/middleware/auditLog.js)
- Express middleware applied AFTER auth, BEFORE routes
- Intercepts all POST, PATCH, DELETE responses
- On response finish: write to AuditLog collection (eventType, actorId, actorRole, route, body summary, timestamp)
- AuditLog collection: set { capped: false } and never expose a delete endpoint

---

### PHASE 4 — Frontend Pages

All pages use the shared base.css and nav partial injected via JS or SSR partial.

#### Step 4.1 — Shared CSS Base (public/css/base.css)
CSS custom properties (variables):
```css
:root {
  --primary: #1a56db;
  --primary-dark: #1240ab;
  --accent: #0ea5e9;
  --success: #16a34a;
  --danger: #dc2626;
  --warning: #d97706;
  --bg: #f8fafc;
  --surface: #ffffff;
  --border: #e2e8f0;
  --text: #0f172a;
  --text-muted: #64748b;
  --radius: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,0.1);
}
```
- CSS reset (box-sizing, margin, padding)
- Typography scale
- Button styles (.btn, .btn-primary, .btn-secondary, .btn-danger)
- Form styles (input, select, textarea, label, form-group)
- Card component (.card)
- Badge component (.badge, .badge-verified, .badge-pending, .badge-rejected)
- Alert/flash messages (.alert-success, .alert-error)
- Responsive grid utility
- Mobile nav hamburger styles

#### Step 4.2 — Shared Nav (injected via JS)
Navigation shows different links based on role stored in localStorage JWT decode:
- Public: Home (public dashboard), Login, Register
- Volunteer: Dashboard, Browse Gigs, My Rewards, Profile, 🔔 bell
- Org: My Gigs, Create Gig, Dashboard, 🔔 bell
- Admin: Users, Verifications, Categories, Rewards, Disputes, Audit, Analytics
- CSR: Dashboard, Report

#### Step 4.3 — Page List & Key Features

| Page | File | Key Features |
|---|---|---|
| Public Dashboard | index.html | No login, category totals, leaderboards, sponsor logos |
| Login | login.html | Role selector, form validation, JWT store, redirect by role |
| Volunteer Register | register-volunteer.html | 5 steps, progress bar, per-step validation, resume from last step |
| Org Register | register-org.html | Single form, submit → pending message |
| CSR Register | register-csr.html | Company info form |
| Volunteer Profile | volunteer-profile.html | Editable fields, doc upload (PDF/IMG), badge display, status |
| Volunteer Dashboard | volunteer-dashboard.html | Stats cards, category chart, gig history table, badge shelf |
| Gig List | gig-list.html | Filter bar (category, location, date, org), gig cards, lock icon |
| Gig Detail | gig-detail.html | Full info, org card, Apply button (auth check), personal statement modal |
| Rewards | rewards.html | Reward cards, eligibility indicator (green/red), redeem button |
| Org Dashboard | org-dashboard.html | Gig table, applicant review panel, pending task approvals panel |
| Create Gig | org-gig-create.html | Full gig form with all fields, verified-only toggle |
| Admin Dashboard | admin-dashboard.html | KPI cards, quick links |
| Admin Verify | admin-verify.html | Queue table, inline doc viewer (iframe), approve/reject buttons |
| Admin Categories | admin-categories.html | CRUD table |
| Admin Rewards | admin-rewards.html | CRUD table with retire action |
| Admin Disputes | admin-disputes.html | Escalation queue, override form |
| Admin Audit Log | admin-audit.html | Filter bar, log table |
| Admin Analytics | admin-analytics.html | Metrics cards + CSV download |
| CSR Dashboard | csr-dashboard.html | Employee hours, category chart, redemption stats, CSV download |

#### Step 4.4 — Client-Side Validation Rules
Every form must validate before fetch() is called:
- Required fields: show red border + error message below field
- Email: regex pattern
- Password: min 8 chars, 1 number, 1 uppercase
- Phone: 10+ digits
- Date fields: valid date, not future for DOB
- File upload: type (pdf/jpg/png) + size (< 5MB)
- Personal statement: min 50 chars
- Gig hours: positive number > 0
- All forms: CSRF-awareness (use SameSite cookies or token in header)

---

### PHASE 5 — Testing

Write tests alongside feature development.

#### Test Stack
- Jest (test runner)
- Supertest (HTTP assertions against Express app)
- mongodb-memory-server (in-memory MongoDB — no external DB needed in CI)

#### Step 5.1 — Test Setup (tests/setup.js)
- Start in-memory MongoDB before all tests
- Seed minimum required data (admin user, 8 categories)
- Clear collections between tests
- Close connection after all tests

#### Step 5.2 — Auth Tests (tests/auth.test.js)
- POST /auth/register → creates user, returns token
- POST /auth/register duplicate email → 409
- POST /auth/login valid credentials → returns token with correct role
- POST /auth/login wrong password → 401
- Protected route without token → 401
- Protected route with wrong role → 403

#### Step 5.3 — Volunteer Tests (tests/volunteer.test.js)
- 5-step registration saves partial progress
- Step 5 sets verificationStatus=pending
- GET /volunteers/me returns complete profile
- Document upload accepts PDF, rejects .exe
- Verified badge only shown when status=verified

#### Step 5.4 — Gig Tests (tests/gig.test.js)
- Org can create gig → appears in GET /gigs
- Volunteer can apply to open gig
- Verified-only gig rejects unverified volunteer application (403)
- Org can approve/reject application
- Application status updates correctly

#### Step 5.5 — Task Tests (tests/task.test.js)
- Task status state machine enforces correct transitions
- Invalid transition (e.g., open → approved) returns 400
- Volunteer completing task notifies org
- Org approval triggers awardPoints()

#### Step 5.6 — Points Tests (tests/points.test.js)
- awardPoints() credits correct points based on category rate
- categoryHours tracked separately from totalHours
- checkEligibility() returns false when points threshold not met
- checkEligibility() returns false when category hours threshold not met
- checkEligibility() returns true when both thresholds met
- Spending points on redemption does NOT reduce categoryHours

#### Step 5.7 — Rewards Tests (tests/rewards.test.js)
- Redeem succeeds when eligible, deducts points
- Redeem fails (400) when not eligible
- Redemption record created in DB

#### Step 5.8 — Admin Tests (tests/admin.test.js)
- Volunteer/org/csr cannot access admin routes (403)
- Admin can approve verification → status=verified, notification sent
- Admin can reject → notification sent with reason
- Admin override sets task status + writes to AuditLog
- AuditLog records cannot be deleted (405 or no delete route)

#### Step 5.9 — Public Dashboard Tests (tests/public.test.js)
- GET /public/impact returns without authentication
- Returns correct category aggregations
- Leaderboard sorted descending by hours

---

### PHASE 6 — Security Hardening

#### Step 6.1 — Helmet
Already added in server.js — sets security headers automatically.

#### Step 6.2 — Rate Limiting
```
npm install express-rate-limit
```
- Apply 100 req/15min on all routes
- Apply 10 req/15min on POST /auth/login (brute-force protection)

#### Step 6.3 — Input Validation
Use express-validator on all POST/PATCH routes:
- Sanitize: trim(), escape() on string inputs
- Validate: isEmail(), isLength(), isISO8601() on dates
- Return 422 with field-level error messages

#### Step 6.4 — File Upload Security
- Check MIME type via file-type library (not just extension)
- Max file size: 5MB
- Store files outside public/ directory (not web-accessible directly)
- Serve uploads via authenticated route: GET /uploads/:filename (checks token)

#### Step 6.5 — MongoDB Injection Prevention
- Never pass raw req.body directly to Mongoose queries
- Use lean() for read-only queries
- Mongoose sanitizes query operators by default with strict mode

#### Step 6.6 — CORS Configuration
- Allow only specific origin(s) in production
- In development: allow localhost:5000

#### Step 6.7 — Environment Secrets
- Never commit .env
- Validate all required env vars on startup — crash if missing

---

### PHASE 7 — Responsive UI

#### Step 7.1 — Breakpoints
```css
/* Mobile first */
/* 375px base */
@media (min-width: 768px)  { /* tablet */ }
@media (min-width: 1280px) { /* desktop */ }
```

#### Step 7.2 — Mobile Nav
- Hamburger button (3 lines) toggles nav open/close via JS class
- Nav links stack vertically on mobile

#### Step 7.3 — Tables on Mobile
- Data tables: overflow-x: auto within a wrapper div
- OR convert to card layout on mobile using @media

#### Step 7.4 — Touch Targets
- All buttons/links minimum 44×44px tap target
- Forms: larger padding on mobile

---

### PHASE 8 — Production Deployment

#### Step 8.1 — Environment Setup
- Create MongoDB Atlas cluster (free tier)
- Set all .env variables in deployment platform dashboard
- Set NODE_ENV=production

#### Step 8.2 — Deployment Platform (pick one)
- **Railway**: connect GitHub repo → auto-deploy on push to main
- **Render**: Free web service, connect MongoDB Atlas
- **Fly.io**: More control, Docker optional

#### Step 8.3 — Pre-Deploy Checklist
- [ ] All tests pass (npm test)
- [ ] No hardcoded secrets in code
- [ ] .gitignore covers .env and uploads/
- [ ] Seed script runs on first deploy (npm run seed)
- [ ] Static files served correctly
- [ ] CORS origin set to production domain
- [ ] JWT_SECRET is a 256-bit random string
- [ ] Rate limiting enabled
- [ ] helmet() enabled

#### Step 8.4 — Smoke Test After Deploy
- Public dashboard loads without login
- Register volunteer → 5 steps work
- Login as all 4 roles → correct redirects
- File upload works in production
- Email sends on verification status change

---

## IMPLEMENTATION ORDER (Strict Sequence)

Follow this exact order — each phase unblocks the next:

```
[1]  npm init, install deps, server.js skeleton, db.js, .env.example
[2]  User model + auth routes (register/login) + JWT middleware
[3]  Tests: auth.test.js — verify token issuance and role guards
[4]  VolunteerProfile model + 5-step register routes + document upload
[5]  Organization model + org register route
[6]  CSR model + CSR register route
[7]  Admin verification routes + email service
[8]  Tests: volunteer.test.js, admin.test.js
[9]  Category model + seed script (run once)
[10] Gig model + gig CRUD routes
[11] Application model + apply route + org applicant review
[12] Tests: gig.test.js
[13] Task model + task state machine routes
[14] Points engine (awardPoints, checkEligibility)
[15] HourRecord + auto-approval cron job + reminder emails
[16] Tests: task.test.js, points.test.js
[17] Reward model + reward routes + redemption flow
[18] Tests: rewards.test.js
[19] Notification model + createNotification utility + GET notifications
[20] Public impact dashboard API (no auth, 5-min cache)
[21] CSR dashboard + CSV export
[22] Admin analytics + audit log middleware
[23] Tests: public.test.js, admin.test.js (extended)
[24] Shared CSS base.css + nav component (HTML)
[25] All HTML pages (build top priority first: login, register, gig-list, volunteer-dashboard)
[26] Client-side JS for each page (fetch API, form validation, JWT handling)
[27] Responsive CSS audit — all breakpoints
[28] Security hardening (rate limiting, express-validator on all routes, MIME check on uploads)
[29] End-to-end test checklist (manual + automated)
[30] Production deployment + smoke test
```

---

## KEY BUSINESS RULES TO ENFORCE IN CODE

| Rule | Where to Enforce |
|---|---|
| Volunteers cannot self-report hours | No endpoint to manually set totalVerifiedHours |
| Verified-only gigs block unverified volunteers | POST /gigs/:id/apply middleware check |
| Task status can only advance (not skip/reverse) | State machine in task route or model method |
| Points deducted on redeem but categoryHours never reduced | points.js service |
| 30-day auto-approval triggers if org unresponsive | cron job — not optional |
| Reminder emails at Day 7, 15, 28 | cron job |
| Audit log entries are immutable | No DELETE /admin/audit route. DB: no TTL index on AuditLog |
| Admin override requires written reason | Validate reason field length >= 10 chars |
| Org cannot approve tasks after 30-day auto-approval fired | Check task status before PATCH |

---

## API ENDPOINT SUMMARY

### Auth
```
POST   /auth/register
POST   /auth/login
```

### Volunteers
```
POST   /volunteers/register/step/:step    (1-5)
GET    /volunteers/me
PUT    /volunteers/me
POST   /volunteers/me/documents           (multer)
GET    /volunteers/me/dashboard
```

### Organizations
```
POST   /orgs/register
GET    /orgs/me
PUT    /orgs/me
GET    /orgs/:id                          (public)
GET    /orgs/me/dashboard
```

### Gigs
```
GET    /gigs                              (public with filters)
GET    /gigs/:id                          (public)
POST   /gigs                              (org only)
PUT    /gigs/:id                          (org owner only)
DELETE /gigs/:id                          (org owner only)
POST   /gigs/:id/apply                    (volunteer only)
GET    /gigs/:id/applications             (org owner only)
PATCH  /applications/:id/decide           (org owner only)
```

### Tasks
```
PATCH  /tasks/:id/start                   (volunteer)
PATCH  /tasks/:id/complete                (volunteer)
PATCH  /tasks/:id/verify                  (org — approve or reject)
```

### Rewards
```
GET    /rewards                           (authenticated — includes eligibility)
POST   /rewards/:id/redeem                (volunteer only)
```

### Notifications
```
GET    /notifications                     (authenticated)
PATCH  /notifications/read                (authenticated)
```

### Public
```
GET    /public/impact                     (no auth)
```

### CSR
```
POST   /csr/register
GET    /csr/me/dashboard
GET    /csr/me/report.csv
```

### Admin (all require role=admin)
```
GET    /admin/verifications
PATCH  /admin/verify/:userId
GET    /admin/users
GET    /admin/categories
POST   /admin/categories
PUT    /admin/categories/:id
PATCH  /admin/categories/:id/archive
GET    /admin/rewards
POST   /admin/rewards
PUT    /admin/rewards/:id
PATCH  /admin/rewards/:id/retire
GET    /admin/disputes
PATCH  /admin/disputes/:taskId/override
GET    /admin/audit
GET    /admin/analytics
GET    /admin/analytics.csv
GET    /admin/dashboard
```

### File Serving (authenticated)
```
GET    /uploads/:filename
```

---

## NOTES ON PROFESSIONAL QUALITY

- Never return stack traces to the client in production — use generic 500 message
- Always return consistent JSON: `{ success: bool, data: {} | null, message: string, errors: [] }`
- Use async/await with try/catch everywhere — never unhandled promise rejections
- Log errors with morgan in dev, use structured logging in production
- All DB queries use lean() for GET operations
- Paginate long lists (default page=1, limit=20)
- Indexes: add MongoDB indexes on frequently queried fields (userId, gigId, status, categoryId)
- DTOs: strip sensitive fields (passwordHash, __v) before returning to client

---

*Document Version: 1.0 — Generated from ImpactCircle SOW v1.0 + Sprint Backlog*
*Platform: Node.js + Express + MongoDB + HTML/CSS/JS*
*Target: Production-ready MVP*
