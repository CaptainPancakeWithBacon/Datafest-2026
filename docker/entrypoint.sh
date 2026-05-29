#!/bin/sh
set -e

php artisan migrate --force --no-interaction
php artisan storage:link --force 2>/dev/null || true

exec php artisan serve --host=0.0.0.0 --port=8000
