# Deployment Guide

## Prerequisites

- Node.js 18+ on the server
- MySQL 8+ database (hosted or managed service)
- A process manager: PM2 or similar
- (Optional) Nginx as a reverse proxy

## Environment

Set the following in your production `.env`:

```
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-domain.com

DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASS=your-db-password
DB_NAME=impactcircle

JWT_SECRET=<long-random-string>

EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=noreply@example.com
EMAIL_PASS=your-smtp-password
EMAIL_FROM=ImpactCircle <noreply@example.com>
```

## Deploy Steps

```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd Practicum-Impact-Circle
npm install --production

# 2. Sync database schema (run once after deploy / migrations)
DB_SYNC_ALTER=true node -e "require('./src/models/index'); require('./src/config/db').sequelize.sync({alter:true}).then(()=>process.exit(0))"

# 3. Start with PM2
pm2 start npm --name impactcircle -- start
pm2 save
pm2 startup
```

## Nginx Reverse Proxy (example)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Health Check

`GET /api/auth/me` returns 401 when unauthenticated — use this as your healthcheck endpoint.
