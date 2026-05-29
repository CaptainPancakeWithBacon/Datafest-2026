<?php

namespace App\Http\Controllers;

use App\Services\EnergyDataService;
use Inertia\Inertia;
use Inertia\Response;

class ChallengeController extends Controller
{
    public function __construct(private EnergyDataService $data) {}

    public function challenge1(): Response
    {
        return Inertia::render('challenges/challenge-1');
    }

    public function challenge2(): Response
    {
        return Inertia::render('challenges/challenge-2');
    }

    public function challenge3(): Response
    {
        return Inertia::render('challenges/challenge-3', [
            'ghg' => $this->data->getGhg(),
            'ghgTarget' => $this->data->getGhgTargetPath(),
            'elecWind' => $this->data->getElecWind(),
            'elecSolar' => $this->data->getElecSolar(),
            'elecYears' => $this->data->getElecYears(),
        ]);
    }
}
