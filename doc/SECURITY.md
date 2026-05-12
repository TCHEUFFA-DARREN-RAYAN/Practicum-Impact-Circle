# Security Notes

## Authentication

- All protected routes require a valid JWT in the `Authorization: Bearer <token>` header.
- JWTs are signed with `JWT_SECRET` — keep this value secret and rotate it if compromised.
- Tokens expire after the configured TTL (default 7 days).

## Account Blocking

- The `isBlocked` flag on the User model is checked on **every authenticated request** by `requireAuth`.
- Blocked users receive a `401 Account suspended` response immediately.
- This prevents blocked users from using previously issued tokens.

## Role-Based Access Control

- `requireRole('admin')` guards all `/api/admin/*` routes.
- `requireRole('org')` guards gig management and task verification routes.
- `requireRole('volunteer')` guards application and task claiming routes.
- Admin accounts cannot be blocked or deleted via the admin UI to prevent lockout.

## Soft Deletes

- User and organization deletion is always a **soft-delete** (sets `isBlocked=true` + `verificationStatus=rejected`).
- This preserves historical data (hours, tasks, applications) for audit and compliance purposes.
- Gig deletion sets `status=cancelled` — the gig is hidden from volunteers but not destroyed.

## Passwords

- Passwords are hashed with bcrypt (cost factor 12) before storage.
- Plain text passwords are never stored or logged.
- Password reset uses a time-limited token sent to the user's email.

## Email TLS

- Set `EMAIL_TLS_REJECT_UNAUTHORIZED=false` only in development environments behind a corporate proxy with a self-signed certificate.
- In production, leave this unset (defaults to rejecting unauthorized certificates).

## Rate Limiting

Consider adding rate limiting (e.g. `express-rate-limit`) on login and registration endpoints in production to prevent brute-force attacks.
