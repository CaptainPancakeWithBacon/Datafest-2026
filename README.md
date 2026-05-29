# Datafest 2026

Laravel 13 + React + Inertia + Tailwind + shadcn/ui

## Prerequisites

- PHP 8.4 with the SQLite extension (`php8.4-sqlite3`)
- Composer
- Node.js + npm

On Ubuntu/Debian, install the SQLite extension if you don't have it:

```bash
sudo apt-get install -y php8.4-sqlite3
```

## Setup

```bash
git clone git@github.com:CaptainPancakeWithBacon/Datafest-2026.git
cd Datafest-2026

cp .env.example .env
composer install
npm install
php artisan key:generate
php artisan migrate
```

## Running locally

```bash
composer run dev
```

The app will be available at **http://localhost:8000**.

## Stack

| Layer | Tech |
|---|---|
| Backend | Laravel 13, PHP 8.4 |
| Frontend | React 19, TypeScript, Tailwind v4 |
| Routing | Inertia.js v3 |
| Components | shadcn/ui, Radix UI |
| Database | SQLite (local) |
| Auth | Laravel Fortify (register, login, 2FA, passkeys) |
