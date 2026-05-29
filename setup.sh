#!/usr/bin/env bash
set -e

echo "==> Datafest 2026 — setup"

# Dependencies
command -v php  >/dev/null || { echo "ERROR: php not found. Install php8.4 + php8.4-sqlite3"; exit 1; }
command -v composer >/dev/null || { echo "ERROR: composer not found"; exit 1; }
command -v npm  >/dev/null || { echo "ERROR: npm not found"; exit 1; }

php -m | grep -q pdo_sqlite || { echo "ERROR: pdo_sqlite extension missing. Run: sudo apt-get install -y php8.4-sqlite3"; exit 1; }

# Env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "    created .env"
fi

# PHP deps
echo "==> pip install (Python API)"
pip install -r python-api/requirements.txt --quiet --break-system-packages 2>/dev/null \
  || pip install -r python-api/requirements.txt --quiet

echo "==> composer install"
composer install --no-interaction --quiet

# JS deps
echo "==> npm install"
npm install --silent

# App key (idempotent)
grep -q "^APP_KEY=$" .env && php artisan key:generate --no-interaction

# Storage dirs & DB
mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache storage/logs bootstrap/cache
touch database/database.sqlite

# Migrations
echo "==> php artisan migrate"
php artisan migrate --no-interaction --force

echo ""
echo "Done. Start the app with:"
echo "  composer run dev"
echo ""
echo "App will be at http://localhost:8000"
