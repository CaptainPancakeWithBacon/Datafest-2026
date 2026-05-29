# Build stage: needs PHP (for wayfinder artisan call) + Node (for Vite)
FROM php:8.4-cli-alpine AS build
RUN apk add --no-cache nodejs npm sqlite sqlite-dev && \
    docker-php-ext-install pdo pdo_sqlite

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Install PHP deps first (cached unless composer.json/lock change)
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

# Install JS deps (cached unless package.json/lock change)
COPY package*.json ./
RUN npm install

# Copy full app, then finish setup and build
COPY . .
RUN mkdir -p bootstrap/cache \
        storage/framework/sessions \
        storage/framework/views \
        storage/framework/cache \
        storage/logs \
        database \
        resources/js/actions \
        resources/js/routes \
        resources/js/wayfinder && \
    touch database/database.sqlite && \
    cp .env.example .env && \
    php artisan key:generate --no-interaction && \
    php artisan package:discover --ansi && \
    php artisan wayfinder:generate --with-form 2>&1 && \
    npm run build

# Final stage: PHP only
FROM php:8.4-cli-alpine
RUN apk add --no-cache sqlite sqlite-dev && \
    docker-php-ext-install pdo pdo_sqlite

WORKDIR /app

COPY . .
COPY --from=build /app/vendor ./vendor
COPY --from=build /app/public/build ./public/build

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
