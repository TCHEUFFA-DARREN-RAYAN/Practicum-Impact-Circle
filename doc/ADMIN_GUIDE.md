# Admin User Guide

## Accessing the Admin Panel

Log in with an account that has `role=admin`. The admin panel is available at `/admin`.

## Verification Queue

`/admin/verify` — Review pending volunteer and organization accounts.

- **Filter** by status (Pending / Verified / Rejected) and by role.
- Click **Approve ✓** to verify the account — the user receives a welcome email.
- Click **Reject** to reject with an optional reason.
- Verified users gain full platform access; rejected users see a rejection banner on their dashboard.

## Manage Users

`/admin/users` — View and manage all user accounts.

| Action | Effect |
|--------|--------|
| **View** | Opens a modal with full profile, skills/org info, verification status, and block state |
| **Block** | Sets `isBlocked=true` — the user is immediately refused login on their next request |
| **Unblock** | Removes the block — the user can log in again |
| **Deactivate** | Sets `isBlocked=true` and `verificationStatus=rejected` — soft-delete preserving all data |

> Admin accounts cannot be blocked or deactivated from this interface.

## Manage Organizations

`/admin/organizations` — View and manage all registered organizations.

| Action | Effect |
|--------|--------|
| **View** | Shows org details (name, contact, address, mission, total hours) |
| **Edit** | Opens a form to update org fields (name, address, contact info, website, mission) |
| **Deactivate** | Blocks the linked user account — the org can no longer log in |

## Categories

`/admin/categories` — Create and manage impact categories (name, color, icon, points per hour).

## Rewards

`/admin/rewards` — Create and retire rewards. Each reward is tied to a category and has a point cost.

## Analytics

`/admin/analytics` — Platform-wide statistics: total users, verified volunteers, active orgs, total gigs, facilitated hours, and recent activity.
