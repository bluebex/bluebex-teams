# Bluebex Teams

Task management system using **Next.js (web)** + **Express (API)** + **Postgres** + **Prisma**.

## Local setup

1. Install deps

```bash
cd NodeProjects/bluebex-teams
npm i
```

2. Create env

```bash
cp .env.example .env
```

3. Start Postgres (Docker Desktop required)

```bash
docker compose up -d
```

4. Generate Prisma + migrate + seed admin

```bash
npm run prisma:generate -w @bluebex/db
npm run db:migrate -w @bluebex/db -- --name init
npm run db:seed -w @bluebex/db
```

5. Run web + api

```bash
npm run dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000/health`

### Default admin
- **username**: `admin`
- **password**: `admin123`

## Deploy to a GCP VM (teams.bluebex.com)

High-level: run Postgres + API + Web on the VM, put **Nginx** in front, and use **Let’s Encrypt** for TLS.

### 1) Create VM + DNS
- Create an Ubuntu VM (e.g. `e2-medium`).
- In Cloud DNS (or your DNS provider), point:
  - `teams.bluebex.com` → VM external IP (A record)

### 2) Install system deps

```bash
sudo apt update
sudo apt install -y nginx git curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

### 3) Install Docker for Postgres (recommended)

Follow Docker Engine install docs for Ubuntu, then:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 4) Clone + configure

```bash
git clone <your-repo-url> bluebex-teams
cd bluebex-teams
npm i
cp .env.example .env
```

Edit `.env`:
- Set `DATABASE_URL` to the VM Postgres
- Set a strong `SESSION_SECRET`
- Set `NEXT_PUBLIC_API_URL` to `https://teams.bluebex.com/api`

### 5) Start Postgres + migrate

```bash
docker compose up -d
npm run prisma:generate -w @bluebex/db
npm run db:migrate -w @bluebex/db -- --name init
npm run db:seed -w @bluebex/db
```

### 6) Build and run with PM2

```bash
npm run build

pm2 start "npm run start -w @bluebex/api" --name bluebex-api
pm2 start "npm run start -w @bluebex/web -- -p 3000" --name bluebex-web
pm2 save
pm2 startup
```

### 7) Nginx reverse proxy

Create `/etc/nginx/sites-available/teams.bluebex.com`:

```nginx
server {
  server_name teams.bluebex.com;

  location /api/ {
    proxy_pass http://127.0.0.1:4000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/teams.bluebex.com /etc/nginx/sites-enabled/teams.bluebex.com
sudo nginx -t
sudo systemctl reload nginx
```

### 8) TLS (Let’s Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d teams.bluebex.com
```

