# Database Schema

## User
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| email | VARCHAR(191) UNIQUE | |
| passwordHash | VARCHAR(255) | bcrypt |
| role | ENUM | volunteer, org, admin, csr |
| verificationStatus | ENUM | pending, verified, rejected |
| rejectionReason | TEXT | |
| isBlocked | BOOLEAN | default false — blocks login |
| resetPasswordToken | VARCHAR(255) | |
| resetPasswordExpires | DATE | |

## VolunteerProfile
Linked 1-to-1 with User (role=volunteer). Stores personal info, skills, interests, hours, points, badges.

## Organization
Linked 1-to-1 with User (role=org). Stores org name, mission, contact info, facilitated hours.

## Gig
| Column | Type | Notes |
|--------|------|-------|
| orgId | INT FK | |
| title | VARCHAR(255) | |
| estimatedHours | FLOAT | |
| startDate / endDate | DATEONLY | |
| locationType | ENUM | in-person, remote |
| status | ENUM | open, closed, cancelled |
| timeOfDay | ENUM | morning, afternoon, evening, flexible |
| startTime / endTime | VARCHAR(10) | e.g. "09:00" |
| isRecurring | BOOLEAN | |
| recurrenceType | ENUM | daily, weekly, monthly |
| recurrenceDays | JSON | e.g. ["Mon","Wed"] |
| hoursPerOccurrence | FLOAT | hours per single session |

## Application
Volunteer applies to a Gig. Status: pending → approved / rejected.

## Task
Created when an Application is approved. Tracks the volunteer's work lifecycle.

| Column | Type | Notes |
|--------|------|-------|
| status | ENUM | accepted → inProgress → completed → approved/rejected |
| hoursLogged | FLOAT | |
| orgRating | INTEGER | 1–5, set by org after approval |
| orgFeedback | TEXT | optional text feedback |
| attendedAt | DATE | org marks volunteer as attended |

## HourRecord
Created when a Task is approved. Stores verified hours and points awarded.

## Reward / Redemption
Reward catalog with point costs; Redemption tracks volunteer redemptions.

## Notification
In-app notification for each user.

## AuditLog
Logs all API activity for admin review.
