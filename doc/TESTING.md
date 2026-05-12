# Testing Guide

## Test Credentials

See `doc/TEST_CREDENTIALS.md` for seeded demo accounts (admin, org, volunteer).

## Manual Test Flows

### Volunteer Flow
1. Register at `/register-volunteer`
2. Complete profile (upload gov ID)
3. Admin verifies account at `/admin/verify`
4. Browse gigs at `/upcoming-shifts` — test time-of-day and hours filters
5. Open a gig detail page — confirm "Apply Now" button
6. Apply — confirm button changes to "Waiting for Approval"
7. Have org approve application in org dashboard
8. In volunteer dashboard: click **Start Task** → **Claim Hours**
9. Org verifies in org dashboard — volunteer gets notified
10. Check verified hours updated in volunteer dashboard KPIs

### Org Flow
1. Register at `/register-org`, get verified by admin
2. Create a one-time gig at `/org-gig-create`
3. Create a recurring gig — check days checkboxes, set time-of-day
4. View applicants in org dashboard — click "View Full Details"
5. Approve an applicant from the detail page
6. When volunteer claims hours, approve from Pending Approvals tab
7. Rate the volunteer (1–5 stars) in the rating modal
8. Visit `/org/volunteers` — confirm volunteer appears in tracker

### Admin Flow
1. Log in at `/login` with admin credentials
2. Go to `/admin/verify` — approve a pending account
3. Go to `/admin/users` — view, block, and unblock a user
4. Go to `/admin/organizations` — view, edit, and deactivate an org

### Blocked User Flow
1. Block a user via admin panel
2. Try to log in as that user — should receive "Account suspended" error
3. Unblock the user — confirm they can log in again

## API Testing

Use the `doc/API_REFERENCE.md` as a reference. Tools like Postman or curl work well.

Example login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin123!"}'
```
