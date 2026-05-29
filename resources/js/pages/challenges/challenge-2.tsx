import { Head } from '@inertiajs/react';
import { useMemo } from 'react';
import { Car, Factory, Home, Zap } from 'lucide-react';
import { EnergyChart } from '@/components/energy-chart';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Challenge2Props {
    elecYears: number[];
    elecWind: number[];
    elecSolar: number[];
    elecCoal: number[];
    elecGas: number[];
    elecNuclear: number[];
}

export default function Challenge2({ elecYears, elecWind, elecSolar, elecCoal, elecGas, elecNuclear }: Challenge2Props) {
    const elecMixConfig = useMemo(
        () => ({
            type: 'bar' as const,
            data: {
                labels: elecYears.map(String),
                datasets: [
                    {
                        label: 'Gas',
                        data: elecGas,
                        backgroundColor: 'rgba(136,135,128,0.80)',
                        borderColor: '#888780',
                        borderWidth: 1,
                    },
                    {
                        label: 'Kolen',
                        data: elecCoal,
                        backgroundColor: 'rgba(211,209,199,0.85)',
                        borderColor: '#B4B2A9',
                        borderWidth: 1,
                    },
                    {
                        label: 'Kernenergie',
                        data: elecNuclear,
                        backgroundColor: 'rgba(55,138,221,0.70)',
                        borderColor: '#378ADD',
                        borderWidth: 1,
                    },
                    {
                        label: 'Wind',
                        data: elecWind,
                        backgroundColor: 'rgba(29,158,117,0.80)',
                        borderColor: '#1D9E75',
                        borderWidth: 1,
                    },
                    {
                        label: 'Zon',
                        data: elecSolar,
                        backgroundColor: 'rgba(99,153,34,0.80)',
                        borderColor: '#639922',
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index' as const, intersect: false },
                },
                scales: {
                    x: { stacked: true, ticks: { autoSkip: true, maxTicksLimit: 9, maxRotation: 0 } },
                    y: { stacked: true, title: { display: true, text: 'PJ' } },
                },
            },
        }),
        [elecYears, elecWind, elecSolar, elecCoal, elecGas, elecNuclear],
    );

    const sectors = [
        {
            name: 'Elektriciteitsproductie',
            Icon: Zap,
            status: 'Transforming fast',
            badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
            questions: [
                'How fast is coal being replaced by wind and solar?',
                'What is the renewable share trend in electricity since 2000?',
            ],
            chart: true,
        },
        {
            name: 'Industrie & Nijverheid',
            Icon: Factory,
            status: 'Lagging',
            badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            questions: [
                'How much of industrial energy consumption is still fossil-based?',
                'Which sub-industries show the earliest signs of decarbonisation?',
            ],
            chart: false,
        },
        {
            name: 'Mobiliteit & Transport',
            Icon: Car,
            status: 'Lagging',
            badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
            questions: [
                'How quickly is EV adoption displacing petrol and diesel?',
                'What role does aviation fuel play in total transport emissions?',
            ],
            chart: false,
        },
        {
            name: 'Gebouwde omgeving',
            Icon: Home,
            status: 'Mixed',
            badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            questions: [
                'How fast are heat pumps replacing gas boilers in households?',
                'What is the trend in household gas consumption per dwelling?',
            ],
            chart: false,
        },
    ];

    const dataSources = [
        'CBS Tabel 3b — Finaal energieverbruik naar sector (1990–2024)',
        'CBS Tabel 4b — Finaal energieverbruik voor mobiliteit',
        'CBS Tabel 4c — Finaal energieverbruik voor warmte',
        'Ember — Monthly electricity data Europe (2015–present)',
        'RVO — Warmtepomp statistieken',
    ];

    return (
        <>
            <Head title="Challenge 2 — Sector Deep Dive" />

            <div className="flex flex-col gap-6 p-4">
                {/* Header */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="mb-3">
                            <Badge variant="secondary">Challenge 2 · Intermediate</Badge>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">
                            Which sectors are driving the transition — and which are lagging?
                        </h1>
                        <p className="text-muted-foreground">
                            Challenge 2 focuses on disaggregating the national energy picture by sector. Use CBS
                            Tabel 3b (finaal energieverbruik naar sector) and Tabel 5 (elektriciteitsproductie)
                            to identify where the transition is happening fastest.
                        </p>
                    </CardContent>
                </Card>

                {/* Sector cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sectors.map(({ name, Icon, status, badgeClass, questions, chart }) => (
                        <Card key={name}>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Icon className="h-5 w-5 text-muted-foreground" />
                                    <CardTitle className="text-base">{name}</CardTitle>
                                    <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}>
                                        {status}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {chart ? (
                                    <>
                                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                                            {[
                                                { color: '#888780', label: 'Gas' },
                                                { color: '#B4B2A9', label: 'Kolen' },
                                                { color: '#378ADD', label: 'Kern' },
                                                { color: '#1D9E75', label: 'Wind' },
                                                { color: '#639922', label: 'Zon' },
                                            ].map(({ color, label }) => (
                                                <span key={label} className="flex items-center gap-1.5">
                                                    <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color }} />
                                                    {label}
                                                </span>
                                            ))}
                                        </div>
                                        <EnergyChart config={elecMixConfig} height={200} />
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-border mb-3">
                                        <p className="text-sm text-muted-foreground text-center px-4">
                                            Connect your data — use CBS Tabel 3b filtered by sector.
                                        </p>
                                    </div>
                                )}
                                <ul className="mt-3 space-y-1">
                                    {questions.map((q) => (
                                        <li key={q} className="text-sm text-muted-foreground flex gap-2">
                                            <span className="mt-0.5 text-muted-foreground/50">›</span>
                                            {q}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Data sources */}
                <Card>
                    <CardHeader>
                        <CardTitle>Data sources</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {dataSources.map((src) => (
                                <li key={src} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <span className="mt-0.5 font-medium text-foreground">·</span>
                                    {src}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

Challenge2.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Challenge 2 — Sector Deep Dive', href: '/challenges/2' },
    ],
};
