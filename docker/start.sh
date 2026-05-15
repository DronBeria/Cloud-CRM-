#!/bin/sh
set -e

APP_DIR="/var/www/html"

cd "$APP_DIR"

echo "==> Cloud CRM starting up..."

# ── Substitute $PORT into nginx config ──────────────────────────────────────
export PORT="${PORT:-10000}"
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Ensure nginx tmp dirs exist
mkdir -p /tmp/nginx-client-body /tmp/nginx-proxy /tmp/nginx-fastcgi /tmp/nginx-uwsgi /tmp/nginx-scgi

# ── Ensure storage directories exist (in case Render disk isn't mounted yet) ─
mkdir -p \
    storage/app/public \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs

chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

# ── Generate APP_KEY if not set ──────────────────────────────────────────────
if [ -z "$APP_KEY" ]; then
    echo "WARNING: APP_KEY is not set. Generating temporary key..."
    php artisan key:generate --force
fi

# ── Run database migrations ──────────────────────────────────────────────────
echo "==> Running database migrations..."
php artisan migrate --force --no-interaction

# ── Install Laravel Passport keys (if not already present) ──────────────────
echo "==> Checking Passport keys..."
php artisan passport:install --force --no-interaction 2>/dev/null || true

# ── Create storage symlink ───────────────────────────────────────────────────
php artisan storage:link --force --no-interaction 2>/dev/null || true

# ── Cache config/routes/views for performance ────────────────────────────────
echo "==> Caching application..."
php artisan config:cache --no-interaction
php artisan route:cache --no-interaction
php artisan view:cache --no-interaction

echo "==> Starting supervisor (nginx + php-fpm + queue + scheduler)..."
exec /usr/bin/supervisord -c /etc/supervisord.conf
