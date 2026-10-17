# Football Live Scores & Analytics

React (Vite) + Tailwind v4 frontend, PHP 8 proxy for FotMob, MySQL (cache/reference) and MongoDB (live payloads).
No login: favourites live in the browser's `localStorage`.

## Setup
```bash
# Databases
mysql -u root -p < backend/sql/schema.sql
cd backend && composer install          # needs the mongodb PHP extension (optional: app works without Mongo)

# API (env: DB_HOST DB_NAME DB_USER DB_PASS MONGO_URI ALLOWED_ORIGIN FOTMOB_X_MAS)
php -S localhost:8000 -t backend

# Frontend
cd frontend && npm install && npm run dev   # http://localhost:5173, /api proxied to :8000
```

## Endpoints
- `GET /api/get_schedule.php?date=YYYYMMDD` – matches grouped by league, sorted by country/name
- `GET /api/get_scores.php?live=1` – live matches · `?matchId=ID` – status, events, stats, lineup
- `GET /api/get_ratings.php?matchId=ID` – `content.lineup` in FotMob's schema

FotMob's API is unofficial: it may require signed headers (set `FOTMOB_X_MAS`) and can change without notice.
