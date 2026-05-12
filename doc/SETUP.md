# Local Development Setup

## Prerequisites

- Node.js 18+
- MySQL 8+
- npm 9+

## Steps

### 1. Clone and install

```bash
git clone <repo-url>
cd Practicum-Impact-Circle
npm install
```

### 2. Create the database

```sql
CREATE DATABASE impactcircle CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`
- `JWT_SECRET` — any long random string
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` — SMTP credentials
- `EMAIL_TLS_REJECT_UNAUTHORIZED=false` — set if your local SMTP uses a self-signed cert

### 4. Sync the database schema

```bash
DB_SYNC_ALTER=true npm run dev
```

This creates/alters all tables. After first run you can remove `DB_SYNC_ALTER=true`.

### 5. Seed test data (optional)

See `doc/TEST_CREDENTIALS.md` for demo account credentials.

### 6. Run in development mode

```bash
npm run dev
```

The server starts at `http://localhost:5000`.

## Useful Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon hot-reload |
| `npm start` | Start without hot-reload |
| `npm test` | Run test suite |

## Troubleshooting

- **Email errors**: Set `EMAIL_TLS_REJECT_UNAUTHORIZED=false` if behind a corporate proxy.
- **DB sync errors**: Ensure the database exists and credentials are correct.
- **Port in use**: Change `PORT` in `.env`.
