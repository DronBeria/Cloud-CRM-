# ── Stage 1: PHP + Node build ─────────────────────────────────────────────────
FROM php:8.2-fpm-alpine AS builder

RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    icu-dev \
    oniguruma-dev \
    gmp-dev \
    openssl \
    curl \
    git \
    unzip \
    nodejs \
    npm

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        pdo \
        pdo_pgsql \
        pdo_mysql \
        zip \
        gd \
        mbstring \
        exif \
        pcntl \
        bcmath \
        intl \
        opcache \
        gmp

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy and install PHP dependencies
COPY composer.json composer.lock* ./
RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-interaction \
    --no-scripts \
    --ignore-platform-reqs

# Copy and build frontend assets
COPY package.json package-lock.json* ./
COPY resources/ resources/
COPY themes/ themes/
RUN npm install --prefer-offline && npm run build && rm -rf node_modules

# Copy remaining application code
COPY . .

# Run composer scripts (package discovery etc.)
RUN composer run-script post-autoload-dump --no-interaction 2>/dev/null || true

# ── Stage 2: Runtime image ────────────────────────────────────────────────────
FROM php:8.2-fpm-alpine

RUN apk add --no-cache \
    nginx \
    supervisor \
    postgresql-dev \
    sqlite-dev \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    icu-dev \
    oniguruma-dev \
    gmp-dev \
    gettext \
    openssl \
    curl

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        pdo \
        pdo_pgsql \
        pdo_mysql \
        pdo_sqlite \
        zip \
        gd \
        mbstring \
        exif \
        pcntl \
        bcmath \
        intl \
        opcache \
        gmp

# PHP opcache tuning for production
RUN { \
    echo 'opcache.enable=1'; \
    echo 'opcache.memory_consumption=256'; \
    echo 'opcache.interned_strings_buffer=16'; \
    echo 'opcache.max_accelerated_files=20000'; \
    echo 'opcache.revalidate_freq=0'; \
    echo 'opcache.validate_timestamps=0'; \
} > /usr/local/etc/php/conf.d/opcache.ini

# PHP memory / upload limits
RUN { \
    echo 'memory_limit=256M'; \
    echo 'upload_max_filesize=64M'; \
    echo 'post_max_size=64M'; \
    echo 'max_execution_time=120'; \
} > /usr/local/etc/php/conf.d/laravel.ini

WORKDIR /var/www/html

# Copy built application from builder stage
COPY --from=builder /var/www/html .

# Copy Docker config files
COPY docker/nginx.conf.template /etc/nginx/nginx.conf.template
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/zz-app.conf
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/start.sh /start.sh

RUN chmod +x /start.sh

# Storage directories Render disk will mount to /var/www/html/storage
RUN mkdir -p \
    storage/app/public \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Symlink storage to public
RUN ln -sf /var/www/html/storage/app/public /var/www/html/public/storage 2>/dev/null || true

EXPOSE 10000

CMD ["/start.sh"]
