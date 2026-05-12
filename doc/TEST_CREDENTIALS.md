# Test Credentials

## Admin
- Email: `admin@impactcircle.ca`
- Password: `Admin@123456`

## Volunteers (First 4)
- `volunteer01@test.local` / `Volunteer123`
- `volunteer02@test.local` / `Volunteer123`
- `volunteer03@test.local` / `Volunteer123`
- `volunteer04@test.local` / `Volunteer123`

## Organizations (Seeded)
- `org01@test.local` / `Volunteer123`
- `org02@test.local` / `Volunteer123`
- `org03@test.local` / `Volunteer123`
- `org04@test.local` / `Volunteer123`
- `org05@test.local` / `Volunteer123`
- `org06@test.local` / `Volunteer123`
- `org07@test.local` / `Volunteer123`

## Notes
- If login returns a database error about `resetPasswordToken`, run `doc/mysql-add-password-reset.sql` on your MySQL database once (the app checks for this on startup and prints instructions).
- Verified organizations for posting gigs: `org01`, `org02`, `org03`
- Pending organizations: `org04`, `org05`, `org06`, `org07`
