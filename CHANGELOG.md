# Changelog

## [Unreleased]

### Added
- `isBlocked` field on User model — blocked users are refused login immediately
- `timeOfDay`, `startTime`, `endTime` fields on Gig for scheduling context
- `isRecurring`, `recurrenceType`, `recurrenceDays`, `hoursPerOccurrence` on Gig for recurring gigs
- `orgRating`, `orgFeedback`, `attendedAt` fields on Task for org ratings and attendance
- `GET /api/admin/users/:id` — admin fetch user with volunteer/org profile
- `PATCH /api/admin/users/:id/block` — admin toggle user block state
- `DELETE /api/admin/users/:id` — admin soft-delete user account
- `GET /api/admin/organizations/:id` — admin fetch org details
- `PUT /api/admin/organizations/:id` — admin update org fields
- `DELETE /api/admin/organizations/:id` — admin soft-delete org account
- `GET /api/gigs/:id/my-application` — volunteer check own application status
- `timeOfDay` and hours (`minHours`/`maxHours`) filters on `GET /api/gigs`
- `PATCH /api/tasks/:id/rate` — org rate a volunteer after task approval
- `GET /api/orgs/me/volunteers` — org list their volunteers with stats
- `GET /api/gigs/applications/:appId` — org get single application with full volunteer profile
- New page: `org-application-detail.html` — dedicated applicant detail page
- New page: `org-volunteers.html` — volunteer tracker for organizations
- New page: `admin-users.html` — admin user management
- New page: `admin-organizations.html` — admin org management

### Changed
- Admin verify: rejection reason is now optional
- Admin verify: removed blue info toast when email notification fails
- Org dashboard: "Cancel" button renamed to "Archive"
- Org dashboard: permanent delete button removed (gigs are soft-deleted only)
- Org dashboard: applicants modal shows volunteer name, skills snippet, and "View Full Details" link
- Org dashboard: star rating modal appears after approving a task
- Volunteer dashboard: "Mark In Progress" renamed to "Start Task"
- Volunteer dashboard: "Submit Completion" renamed to "Claim Hours"
- Upcoming Shifts: "access filter" replaced with "time of day" filter
- Upcoming Shifts: hours filter added (Under 2h / 2–4h / 4–8h / 8+h)
- Upcoming Shifts: gig cards show hours badge and time-of-day pill
- Gig Detail: apply button shows "Waiting for Approval" if already applied
- Gig Detail: application approved/rejected banners
- Org Gig Create: recurring gig section with frequency, days, time, and session hours
- `requireAuth` middleware: checks `isBlocked` on every request
- Email service: `EMAIL_TLS_REJECT_UNAUTHORIZED` env var controls TLS cert validation
- Org sidebar: "Approved Volunteers" link updated to point to Volunteer Tracker
