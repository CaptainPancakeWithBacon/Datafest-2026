<?php

use App\Http\Controllers\ChallengeController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::get('/challenges/1', [ChallengeController::class, 'challenge1'])->name('challenges.1');
Route::get('/challenges/2', [ChallengeController::class, 'challenge2'])->name('challenges.2');
Route::get('/challenges/3', [ChallengeController::class, 'challenge3'])->name('challenges.3');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
