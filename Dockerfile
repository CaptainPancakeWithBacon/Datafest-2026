# Build stage: needs PHP (for wayfinder artisan call) + Node (for Vite)
FROM php:8.4-cli-alpine AS build
RUN apk add --no-cache nodejs npm sqlite sqlite-dev && \
    docker-php-ext-install pdo pdo_sqlite

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-interaction

COPY package*.json ./
RUN npm install

COPY . .
# Provide a minimal env so Laravel can bootstrap for wayfinder:generate
RUN cp .env.example .env && php artisan key:generate --no-interaction
RUN npm run build

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
