# Contributing

## Branch Strategy

- `master` — stable, production-ready
- `dev` — integration branch; merge feature branches here first
- Feature branches: `feature/<short-description>` (e.g. `feature/recurring-gigs`)
- Bug fixes: `fix/<short-description>`

## Commit Messages

Use imperative present tense, short subject line (≤ 72 chars):

```
add recurring gig support to gig creation form
fix blocked user check in requireAuth middleware
update org dashboard to rename Cancel to Archive
```

## Pull Requests

1. Branch from `dev`
2. Keep PRs focused — one feature or fix per PR
3. Run `node scripts/check-syntax.js` before pushing
4. Describe what changed and why in the PR description

## Adding New API Endpoints

1. Add the route in the appropriate `src/routes/*.js` file
2. Add authentication (`requireAuth`) and role (`requireRole`) middleware as needed
3. Add input validation using `express-validator` and the `validate` middleware
4. Document the endpoint in `doc/API_REFERENCE.md`

## Adding New Pages

1. Create the HTML file in `public/pages/`
2. Add a route entry in `server.js`
3. Use `API.requireAuth('role')` at the top of the page script if login is required
4. Import `/js/api.js`, `/js/nav.js`, and `/js/footer.js`

## Database Changes

1. Add/modify fields in `src/models/index.js`
2. Run `node scripts/sync-db.js` to apply schema changes
3. Update `doc/SCHEMA.md` to reflect the new columns
