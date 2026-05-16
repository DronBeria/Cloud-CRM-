#!/bin/sh
# No set -e — handle errors explicitly so one failure doesn't kill the container

APP_DIR="/var/www/html"
cd "$APP_DIR"

echo "==> Cloud CRM starting up..."

# ── Substitute $PORT into nginx config ──────────────────────────────────────
export PORT="${PORT:-10000}"
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Ensure nginx tmp dirs exist
mkdir -p /tmp/nginx-client-body /tmp/nginx-proxy /tmp/nginx-fastcgi /tmp/nginx-uwsgi /tmp/nginx-scgi

# ── Ensure storage directories exist ────────────────────────────────────────
mkdir -p \
    storage/app/public \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache

chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true
chmod -R 755 storage bootstrap/cache 2>/dev/null || true

# ── Generate APP_KEY if not set ──────────────────────────────────────────────
if [ -z "$APP_KEY" ]; then
    echo "==> Generating APP_KEY..."
    APP_KEY="base64:$(openssl rand -base64 32)"
    export APP_KEY
fi

# ── Ensure a .env file exists (Laravel uses it as a fallback) ────────────────
if [ ! -f ".env" ]; then
    echo "APP_KEY=${APP_KEY}" > .env
    echo "APP_ENV=${APP_ENV:-production}" >> .env
    echo "APP_DEBUG=${APP_DEBUG:-false}" >> .env
fi

# ── SQLite: create the database file if using SQLite ─────────────────────────
if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
    DB_FILE="${DB_DATABASE:-/var/www/html/database/database.sqlite}"
    mkdir -p "$(dirname "$DB_FILE")"
    touch "$DB_FILE"
    chown www-data:www-data "$DB_FILE" 2>/dev/null || true
    echo "==> SQLite database: $DB_FILE"
fi

# ── Wait for PostgreSQL to be ready ─────────────────────────────────────────
if [ "${DB_CONNECTION}" = "pgsql" ] && [ -n "${DB_HOST}" ]; then
    echo "==> Waiting for database at ${DB_HOST}:${DB_PORT:-5432}..."
    for i in $(seq 1 30); do
        if php -r "new PDO('pgsql:host=${DB_HOST};port=${DB_PORT:-5432};dbname=${DB_DATABASE}', '${DB_USERNAME}', '${DB_PASSWORD}');" 2>/dev/null; then
            echo "==> Database ready."
            break
        fi
        echo "    Attempt $i/30, waiting 2s..."
        sleep 2
    done
fi

# ── Clear stale caches ───────────────────────────────────────────────────────
php artisan config:clear --no-interaction 2>/dev/null || true
php artisan cache:clear --no-interaction 2>/dev/null || true

# ── Run database migrations ──────────────────────────────────────────────────
echo "==> Running database migrations..."
php artisan migrate --force --no-interaction 2>&1 || echo "WARNING: Migrations failed or already up to date"

# ── Install Laravel Passport keys ───────────────────────────────────────────
echo "==> Checking Passport keys..."
php artisan passport:install --force --no-interaction 2>/dev/null || true

# ── Create storage symlink ───────────────────────────────────────────────────
php artisan storage:link --force --no-interaction 2>/dev/null || true

# ── Cache config for performance (non-fatal — app works without it) ──────────
echo "==> Caching application config..."
php artisan config:cache --no-interaction 2>/dev/null || echo "WARNING: config:cache skipped"

# NOTE: route:cache is intentionally skipped — web.php has a closure route
# (email verification) that cannot be serialised. App works fine without it.

echo "==> Starting supervisor (nginx + php-fpm + queue + scheduler)..."
exec /usr/bin/supervisord -c /etc/supervisord.conf
