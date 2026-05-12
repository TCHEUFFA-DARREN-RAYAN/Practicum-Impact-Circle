# Organization User Guide

## Getting Started

1. Register at `/register-org` and fill in your organization details.
2. Wait for admin verification (your account will be reviewed and you will receive a confirmation email).
3. Once verified, you can post gigs and manage volunteers.

## Posting a Gig

Go to **Post an Opportunity** from your dashboard or sidebar.

### One-Time Gig
- Fill in title, description, category, dates, estimated hours, and location.
- Mark "Verified volunteers only" if your gig requires background-checked volunteers.

### Recurring Gig
- Check **Recurring gig** to reveal the recurrence section.
- Choose **frequency**: Daily, Weekly, or Monthly.
- For Weekly: select which days of the week (Mon, Tue, Wed, etc.).
- Set **Time of Day**: Morning / Afternoon / Evening / Flexible, or choose Custom to set exact start and end times.
- Enter **Hours per session** — total hours are calculated automatically based on the date range.

## Managing Applicants

From your dashboard, click **Applicants** on any gig row.

- The modal shows each applicant's name, email, verification status, and top skills.
- Click **View Full Details** to open a dedicated page with the volunteer's full profile, interests, history, and personal statement.
- From either the modal or the detail page, you can **Approve** or **Reject** the application.

## Verifying Task Completions

When a volunteer claims their hours, you receive an in-app notification and the task appears in the **Pending Approvals** tab.

- Click **Approve ✓** to verify the completion (hours are logged and points awarded).
- After approving, a **star rating modal** appears — rate the volunteer 1–5 stars and leave optional feedback.
- Click **Reject** to decline with a reason (minimum 5 characters required).

## Volunteer Tracker

Visit `/org/volunteers` (linked in the sidebar as **Volunteer Tracker**) to see:

- All volunteers who have worked with your organization
- Session count, total hours, and last active date
- **Active Now** badge for volunteers with tasks currently in progress
- **Recurring** badge for volunteers with 2 or more completed sessions
- Filter tabs: All / Active Now / Recurring

## Archiving Gigs

Click **Archive** on any open gig to soft-delete it (status set to `cancelled`). The gig data is preserved in the database but hidden from volunteers.
