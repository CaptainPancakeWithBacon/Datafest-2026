# Datafest 2026 — Dutch Energy Transition Dashboard

Laravel 13 + React + Inertia + Tailwind + shadcn/ui

---

## Quickstart

### Option A — Docker (no PHP/Node needed)

```bash
git clone git@github.com:CaptainPancakeWithBacon/Datafest-2026.git
cd Datafest-2026
cp .env.example .env
docker compose up --build
```

Open **http://localhost:8000**. Migrations run automatically on start.

---

### Option B — Local

**Prerequisites:** PHP 8.4, Composer, Node.js/npm.

On Ubuntu/Debian, install the required PHP extensions if missing:
```bash
sudo apt-get install -y php8.4-sqlite3 php8.4-zip
```

On Windows (XAMPP/Laragon): enable `extension=zip` in your `php.ini`.

Then:
```bash
git clone git@github.com:CaptainPancakeWithBacon/Datafest-2026.git
cd Datafest-2026
./setup.sh
composer run dev
```

Open **http://localhost:8000**.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Laravel 13, PHP 8.4 |
| Frontend | React 19, TypeScript, Tailwind v4 |
| Routing | Inertia.js v3 |
| Components | shadcn/ui, Radix UI |
| Database | SQLite |
| Charts | Chart.js |

## Challenges

| # | Title | Level |
|---|---|---|
| 1 | The Dutch Energy Turning Point | Beginner–Intermediate |
| 2 | Zeeland — From Province to Postcode | Beginner–Intermediate |
| 3 | 2030 Target Tracker | Advanced |

## Data

CBS Statline — Energie en broeikasgassen 1990–2024 (Tabel 1b, 5, 6a, 3b).
The Excel file is included in `data/` and read directly by the app at boot (cached in memory).
