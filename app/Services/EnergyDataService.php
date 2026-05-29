<?php

namespace App\Services;

class EnergyDataService
{
    public function getMixYears(): array
    {
        return range(1990, 2024);
    }

    public function getGas(): array
    {
        return [1325, 1479, 1440, 1481, 1430, 1469, 1628, 1525, 1506, 1472, 1476, 1506, 1490, 1501, 1536, 1492, 1433, 1397, 1454, 1489, 1683, 1473, 1414, 1408, 1236, 1216, 1266, 1307, 1281, 1339, 1301, 1255, 991, 933, 945];
    }

    public function getOil(): array
    {
        return [1060, 1047, 1060, 1070, 1095, 1122, 1147, 1148, 1156, 1163, 1164, 1190, 1215, 1307, 1309, 1305, 1315, 1324, 1242, 1215, 1262, 1209, 1222, 1154, 1137, 1136, 1173, 1189, 1160, 1116, 1096, 1114, 1063, 1087, 1042];
    }

    public function getCoal(): array
    {
        return [367, 336, 335, 337, 367, 374, 361, 352, 358, 312, 325, 346, 348, 359, 355, 338, 324, 352, 334, 312, 316, 311, 341, 343, 379, 464, 430, 386, 346, 269, 172, 234, 232, 158, 173];
    }

    public function getNuclear(): array
    {
        return [38, 36, 43, 43, 43, 43, 45, 25, 39, 40, 41, 41, 40, 41, 39, 41, 36, 41, 40, 41, 38, 40, 39, 28, 39, 39, 38, 33, 34, 38, 40, 37, 40, 39, 35];
    }

    public function getRenewable(): array
    {
        return [31, 32, 33, 35, 35, 39, 44, 48, 51, 53, 57, 60, 66, 64, 76, 95, 101, 105, 123, 138, 138, 147, 151, 147, 147, 156, 161, 176, 194, 228, 283, 333, 357, 377, 408];
    }

    public function getTotal(): array
    {
        $g = $this->getGas();
        $o = $this->getOil();
        $c = $this->getCoal();
        $n = $this->getNuclear();
        $r = $this->getRenewable();

        return array_map(fn ($i) => $g[$i] + $o[$i] + $c[$i] + $n[$i] + $r[$i], range(0, 34));
    }

    public function getRenewableSharePct(): array
    {
        $r = $this->getRenewable();
        $t = $this->getTotal();

        return array_map(fn ($i) => round($r[$i] / $t[$i] * 100, 2), range(0, 34));
    }

    public function getTransitionScore(): array
    {
        $r = $this->getRenewable();
        $g = $this->getGas();
        $o = $this->getOil();
        $c = $this->getCoal();
        $score = [];

        for ($i = 1; $i < 35; $i++) {
            $dR = $r[$i] - $r[$i - 1];
            $dF = ($g[$i] + $o[$i] + $c[$i]) - ($g[$i - 1] + $o[$i - 1] + $c[$i - 1]);
            $score[] = round($dR - $dF);
        }

        return $score;
    }

    public function getScoreYears(): array
    {
        return range(1991, 2024);
    }

    public function getElecYears(): array
    {
        return range(2000, 2024);
    }

    public function getElecWind(): array
    {
        return [3, 3, 3.4, 4.7, 6.7, 7.4, 9.8, 12.4, 15.3, 16.5, 14.4, 18.4, 17.9, 20.3, 20.9, 27.2, 29.4, 38, 38, 41.4, 55, 65.2, 77.6, 106.3, 120.6];
    }

    public function getElecSolar(): array
    {
        return [0, 0, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.2, 0.4, 0.9, 1.9, 2.8, 4, 5.8, 7.9, 13.3, 19.4, 30.8, 40.7, 60, 70.5, 76.6];
    }

    public function getElecBiomass(): array
    {
        return [7.2, 8.5, 10.5, 9.2, 12, 19, 18.7, 14.5, 18.3, 22, 25.4, 25.5, 25.9, 21.4, 18, 17.8, 17.7, 16.6, 16.4, 21, 31.8, 39.3, 35.4, 27.4, 24];
    }

    public function getElecGas(): array
    {
        return [189, 195.9, 198.5, 202.2, 217.8, 209.5, 205.5, 219.2, 232.4, 246.6, 264.9, 244.6, 194.6, 194.5, 183.6, 164.9, 189.1, 207.8, 207.5, 254.6, 261.1, 204.1, 171.9, 165.4, 159.3];
    }

    public function getElecCoal(): array
    {
        return [84.3, 89.7, 89.8, 93.2, 87.9, 83, 83.3, 88.6, 81.1, 84.4, 78.8, 74.8, 87.2, 88.4, 103.5, 141.8, 132.5, 113, 99.3, 63.7, 27.4, 52.6, 53.3, 31.4, 27];
    }

    public function getElecNuclear(): array
    {
        return [14.1, 14.3, 14.1, 14.5, 13.8, 14.4, 12.5, 15.1, 15, 15.3, 14.3, 14.9, 14.1, 10.4, 14.7, 14.7, 14.3, 12.2, 12.7, 14.1, 14.7, 13.8, 15, 14.3, 12.9];
    }

    public function getGhg(): array
    {
        return [227.5, 235.5, 235.8, 236.1, 236.7, 236.5, 246.7, 238.1, 238.7, 226, 224.6, 226.1, 224, 224, 225.7, 219.8, 214.5, 213.4, 213.6, 207.7, 219.3, 205.3, 200.9, 199.9, 192.6, 199.9, 200.2, 196.7, 191.4, 185.2, 168.3, 170.6, 157, 146.4, 144.8];
    }

    public function getGhgTargetPath(): array
    {
        return array_map(fn ($y) => round(227.5 - (227.5 - 102.4) * ($y - 1990) / 40, 1), range(1990, 2024));
    }
}
