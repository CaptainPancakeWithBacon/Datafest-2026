import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { EnergyChart } from '@/components/energy-chart';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Challenge3Props {
    ghg: number[];
    ghgTarget: number[];
    elecWind: number[];
    elecSolar: number[];
    elecYears: number[];
}

const BASE_RENEWABLE_2024 = 408;
const BASE_TOTAL_2024 = 2629.6;
const BASE_GHG_2024 = 144.8;
const MIX_YEARS = Array.from({ length: 35 }, (_, i) => 1990 + i);

export default function Challenge3({ ghg, ghgTarget, elecWind, elecSolar, elecYears }: Challenge3Props) {
    const [windGrowth, setWindGrowth] = useState(12);
    const [solarGrowth, setSolarGrowth] = useState(10);
    const [gasReduction, setGasReduction] = useState(20);

    const projection = useMemo(() => {
        const projYears = [2025, 2026, 2027, 2028, 2029, 2030];
        return projYears.map((_, step) => {
            const s = step + 1;
            const totalRenewable = BASE_RENEWABLE_2024 + (windGrowth + solarGrowth) * s;
            const totalEnergy = Math.max(BASE_TOTAL_2024 - gasReduction * s * 0.5, 1000);
            return Math.min((totalRenewable / totalEnergy) * 100, 100);
        });
    }, [windGrowth, solarGrowth, gasReduction]);

    const projectedGhg2030 = useMemo(() => {
        return +(
            BASE_GHG_2024 -
            gasReduction * 6 * 0.056 -
            (windGrowth + solarGrowth) * 6 * 0.01
        ).toFixed(1);
    }, [windGrowth, solarGrowth, gasReduction]);

    const projectedRenewable2030 = +(projection[5] ?? 0).toFixed(1);

    // Historical electricity renewable share (wind+solar as % of total elec)
    const elecTotals = elecYears.map((_, i) => {
        const w = elecWind[i] ?? 0;
        const s = elecSolar[i] ?? 0;
        return { w, s, total: w + s };
    });

    const scenarioConfig = useMemo(
        () => ({
            type: 'line' as const,
            data: {
                labels: [
                    ...elecYears.map(String),
                    '2025', '2026', '2027', '2028', '2029', '2030',
                ],
                datasets: [
                    {
                        label: 'Wind + Solar aandeel elektriciteit (historisch)',
                        data: [
                            ...elecTotals.map(({ w, s }, i) => {
                                const gas = [189, 195.9, 198.5, 202.2, 217.8, 209.5, 205.5, 219.2, 232.4, 246.6, 264.9, 244.6, 194.6, 194.5, 183.6, 164.9, 189.1, 207.8, 207.5, 254.6, 261.1, 204.1, 171.9, 165.4, 159.3];
                                const coal = [84.3, 89.7, 89.8, 93.2, 87.9, 83, 83.3, 88.6, 81.1, 84.4, 78.8, 74.8, 87.2, 88.4, 103.5, 141.8, 132.5, 113, 99.3, 63.7, 27.4, 52.6, 53.3, 31.4, 27];
                                const nuclear = [14.1, 14.3, 14.1, 14.5, 13.8, 14.4, 12.5, 15.1, 15, 15.3, 14.3, 14.9, 14.1, 10.4, 14.7, 14.7, 14.3, 12.2, 12.7, 14.1, 14.7, 13.8, 15, 14.3, 12.9];
                                const biomass = [7.2, 8.5, 10.5, 9.2, 12, 19, 18.7, 14.5, 18.3, 22, 25.4, 25.5, 25.9, 21.4, 18, 17.8, 17.7, 16.6, 16.4, 21, 31.8, 39.3, 35.4, 27.4, 24];
                                const tot = w + s + (gas[i] ?? 0) + (coal[i] ?? 0) + (nuclear[i] ?? 0) + (biomass[i] ?? 0);
                                return tot > 0 ? +((w + s) / tot * 100).toFixed(1) : 0;
                            }),
                            ...new Array(6).fill(null),
                        ],
                        borderColor: '#1D9E75',
                        backgroundColor: 'rgba(29,158,117,0.08)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 2,
                        borderWidth: 2,
                    },
                    {
                        label: 'Geprojecteerd aandeel (scenario)',
                        data: [
                            ...new Array(elecYears.length - 1).fill(null),
                            elecTotals[elecTotals.length - 1]
                                ? +((elecTotals[elecTotals.length - 1].w + elecTotals[elecTotals.length - 1].s) /
                                    (() => {
                                        const gas = 159.3; const coal = 27; const nuclear = 12.9; const bio = 24;
                                        return elecTotals[elecTotals.length - 1].w + elecTotals[elecTotals.length - 1].s + gas + coal + nuclear + bio;
                                    })() * 100).toFixed(1)
                                : 0,
                            ...projection,
                        ],
                        borderColor: '#378ADD',
                        borderDash: [7, 4],
                        borderWidth: 2,
                        fill: false,
                        tension: 0.3,
                        pointRadius: 2,
                    },
                    {
                        label: 'Doelstelling elektriciteit (70%)',
                        data: new Array(elecYears.length + 6).fill(70),
                        borderColor: '#E24B4A',
                        borderDash: [4, 4],
                        borderWidth: 1.5,
                        fill: false,
                        pointRadius: 0,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { mode: 'index' as const, intersect: false } },
                scales: {
                    x: { ticks: { autoSkip: true, maxTicksLimit: 11, maxRotation: 0 } },
                    y: { min: 0, max: 100, title: { display: true, text: '% hernieuwbaar' } },
                },
            },
        }),
        [elecYears, elecTotals, projection],
    );

    const ghgConfig = useMemo(
        () => ({
            type: 'line' as const,
            data: {
                labels: MIX_YEARS.map(String),
                datasets: [
                    {
                        label: 'Werkelijke uitstoot',
                        data: ghg,
                        borderColor: '#E24B4A',
                        backgroundColor: 'rgba(226,75,74,0.10)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 2,
                    },
                    {
                        label: 'Vereist tempo',
                        data: ghgTarget,
                        borderColor: '#1D9E75',
                        borderDash: [7, 4],
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { mode: 'index' as const, intersect: false } },
                scales: {
                    x: { ticks: { autoSkip: true, maxTicksLimit: 9, maxRotation: 0 } },
                    y: { min: 80, max: 260, title: { display: true, text: 'Mton CO₂-eq' } },
                },
            },
        }),
        [ghg, ghgTarget],
    );

    const statusCards = [
        { target: 'GHG −55% vs 1990', current: '−36% (144.8 Mton)', goal: '≤102 Mton', badge: 'Bijna op koers', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
        { target: 'Renewable energy share', current: '15.5%', goal: '~27% EU target', badge: 'Achterstand', badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
        { target: 'Renewable electricity', current: '49.9%', goal: '70%', badge: 'Bijna op koers', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
        { target: 'Coal phaseout', current: '173 PJ', goal: '0 PJ by 2030', badge: 'Op koers', badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
    ];

    const policyCards = [
        {
            title: 'Offshore wind',
            body: 'Triple deployment pace. 21 GW by 2031 requires consistent permitting and grid connections. Current pace: ~1.5 GW/yr. Required: ~3 GW/yr.',
        },
        {
            title: 'Grid infrastructure',
            body: 'Current congestion blocks renewable integration in the Netherlands. Priority grid expansion is the single biggest near-term bottleneck.',
        },
        {
            title: 'Heat & industry',
            body: 'Transport and heating remain 84% fossil-dependent. Electrification, green hydrogen, and industrial heat pumps are essential. No credible plan yet for most industrial processes.',
        },
    ];

    return (
        <>
            <Head title="Challenge 3 — 2030 Target Tracker" />

            <div className="flex flex-col gap-6 p-4">
                {/* Header */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="mb-3">
                            <Badge variant="secondary">Challenge 3 · Advanced</Badge>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">2030 Target Tracker</h1>
                        <p className="text-muted-foreground">
                            Is Nederland op koers voor de klimaatdoelstellingen van 2030? Gebruik de
                            scenarioverkenner hieronder om verschillende transitiepaden te simuleren.
                        </p>
                    </CardContent>
                </Card>

                {/* Status cards */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    {statusCards.map(({ target, current, goal, badge, badgeClass }) => (
                        <Card key={target}>
                            <CardContent className="pt-4 pb-4">
                                <p className="text-xs text-muted-foreground mb-1">{target}</p>
                                <p className="text-xl font-bold text-foreground">{current}</p>
                                <p className="text-xs text-muted-foreground mt-1">Doel: {goal}</p>
                                <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
                                    {badge}
                                </span>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* GHG historical chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Greenhouse gas emissions vs 2030 target pathway</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Mton CO₂-equivalent — CBS Tabel 6a + Klimaatakkoord −55% target
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#E24B4A' }} />
                                Werkelijke uitstoot
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-6 border-t-2 border-dashed inline-block" style={{ borderColor: '#1D9E75' }} />
                                <span className="ml-1">Vereist tempo</span>
                            </span>
                        </div>
                        <EnergyChart config={ghgConfig} height={280} />
                    </CardContent>
                </Card>

                {/* Scenario explorer */}
                <Card>
                    <CardHeader>
                        <CardTitle>Interactive scenario explorer</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Pas de schuifregelaars aan om verschillende transitiescenario's te verkennen.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Sliders */}
                            <div className="space-y-6">
                                {[
                                    {
                                        label: 'Annual wind growth (PJ/yr)',
                                        value: windGrowth,
                                        setter: setWindGrowth,
                                        min: 0,
                                        max: 30,
                                    },
                                    {
                                        label: 'Annual solar growth (PJ/yr)',
                                        value: solarGrowth,
                                        setter: setSolarGrowth,
                                        min: 0,
                                        max: 30,
                                    },
                                    {
                                        label: 'Annual gas reduction (PJ/yr)',
                                        value: gasReduction,
                                        setter: setGasReduction,
                                        min: 0,
                                        max: 80,
                                    },
                                ].map(({ label, value, setter, min, max }) => (
                                    <div key={label}>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-sm font-medium text-foreground">{label}</label>
                                            <span className="text-sm font-bold text-foreground">{value}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={min}
                                            max={max}
                                            value={value}
                                            onChange={(e) => setter(Number(e.target.value))}
                                            className="w-full accent-emerald-600"
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                                            <span>{min}</span>
                                            <span>{max}</span>
                                        </div>
                                    </div>
                                ))}

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <Card>
                                        <CardContent className="pt-3 pb-3">
                                            <p className="text-xs text-muted-foreground mb-0.5">
                                                Projected renewable 2030
                                            </p>
                                            <p
                                                className={`text-xl font-bold ${
                                                    projectedRenewable2030 >= 27
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-red-600 dark:text-red-400'
                                                }`}
                                            >
                                                {projectedRenewable2030}%
                                            </p>
                                            <p className="text-xs text-muted-foreground">Doel: ≥27%</p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="pt-3 pb-3">
                                            <p className="text-xs text-muted-foreground mb-0.5">
                                                Projected GHG 2030
                                            </p>
                                            <p
                                                className={`text-xl font-bold ${
                                                    projectedGhg2030 <= 102
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-red-600 dark:text-red-400'
                                                }`}
                                            >
                                                {projectedGhg2030} Mt
                                            </p>
                                            <p className="text-xs text-muted-foreground">Doel: ≤102 Mton</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            {/* Projection chart */}
                            <div className="lg:col-span-2">
                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#1D9E75' }} />
                                        Historisch aandeel
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-6 border-t-2 border-dashed inline-block" style={{ borderColor: '#378ADD' }} />
                                        <span className="ml-1">Projectie scenario</span>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-6 border-t-2 border-dashed inline-block" style={{ borderColor: '#E24B4A' }} />
                                        <span className="ml-1">Doelstelling 70%</span>
                                    </span>
                                </div>
                                <EnergyChart config={scenarioConfig} height={320} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Policy recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {policyCards.map(({ title, body }, i) => (
                        <Card key={title}>
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold flex-shrink-0">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                                        <p className="text-sm text-muted-foreground">{body}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </>
    );
}

Challenge3.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Challenge 3 — 2030 Target Tracker', href: '/challenges/3' },
    ],
};
