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
        return Inertia::render('challenges/challenge-1', [
            'mixYears' => $this->data->getMixYears(),
            'gas' => $this->data->getGas(),
            'oil' => $this->data->getOil(),
            'coal' => $this->data->getCoal(),
            'nuclear' => $this->data->getNuclear(),
            'renewable' => $this->data->getRenewable(),
            'renewablePct' => $this->data->getRenewableSharePct(),
            'scoreYears' => $this->data->getScoreYears(),
            'transitionScore' => $this->data->getTransitionScore(),
            'elecYears' => $this->data->getElecYears(),
            'elecWind' => $this->data->getElecWind(),
            'elecSolar' => $this->data->getElecSolar(),
            'elecBiomass' => $this->data->getElecBiomass(),
            'elecGas' => $this->data->getElecGas(),
            'elecCoal' => $this->data->getElecCoal(),
            'elecNuclear' => $this->data->getElecNuclear(),
            'ghg' => $this->data->getGhg(),
            'ghgTarget' => $this->data->getGhgTargetPath(),
        ]);
    }

    public function challenge2(): Response
    {
        return Inertia::render('challenges/challenge-2', [
            'elecYears' => $this->data->getElecYears(),
            'elecWind' => $this->data->getElecWind(),
            'elecSolar' => $this->data->getElecSolar(),
            'elecCoal' => $this->data->getElecCoal(),
            'elecGas' => $this->data->getElecGas(),
            'elecNuclear' => $this->data->getElecNuclear(),
        ]);
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
