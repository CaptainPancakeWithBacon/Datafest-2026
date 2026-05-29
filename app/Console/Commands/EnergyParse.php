<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('energy:parse {xlsx? : Path to the CBS Excel file}')]
#[Description('Parse CBS energy Excel into storage/app/energy-data.json')]
class EnergyParse extends Command
{
    public function handle(): int
    {
        $xlsx = $this->argument('xlsx')
            ?? base_path('data/energie en broeikasgassen 1990-2024.xlsx');

        if (! file_exists($xlsx)) {
            $this->error("File not found: {$xlsx}");
            $this->line('Usage: php artisan energy:parse /path/to/file.xlsx');

            return self::FAILURE;
        }

        $out = storage_path('app/energy-data.json');
        $script = base_path('scripts/parse_energy_data.py');

        $this->info("Parsing {$xlsx} …");

        passthru('python3 '.escapeshellarg($script).' '.escapeshellarg($xlsx).' '.escapeshellarg($out), $code);

        if ($code !== 0) {
            $this->error('Parser failed.');

            return self::FAILURE;
        }

        $this->info('Done → '.$out);

        return self::SUCCESS;
    }
}
