import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { Chart } from 'chart.js/auto';
import { EnergyChart } from '@/components/energy-chart';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { energyApi } from '@/hooks/use-energy-api';

interface EnergyData {
    mix: {
        years: number[];
        gas: number[];
        oil: number[];
        coal: number[];
        nuclear: number[];
        renewable: number[];
        total: number[];
        renewable_share_pct: number[];
    };
    transition_score: { years: number[]; score: number[] };
    electricity: {
        years: number[];
        wind: number[];
        solar: number[];
        biomass: number[];
        gas: number[];
        coal: number[];
        nuclear: number[];
        total: number[];
    };
    ghg: {
        years: number[];
        total: number[];
        target: number[];
        by_sector: Record<string, number[]>;
    };
}

const actShadingPlugin = {
    id: 'actShading',
    beforeDraw(chart: Chart) {
        const { ctx, chartArea, scales } = chart;
        if (!chartArea) return;
        const x = scales['x'];
        const shade = (fromIdx: number, toIdx: number, color: string) => {
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.fillStyle = color;
            ctx.fillRect(
                x.getPixelForValue(fromIdx),
                chartArea.top,
                x.getPixelForValue(toIdx) - x.getPixelForValue(fromIdx),
                chartArea.height,
            );
            ctx.restore();
        };
        shade(0, 24, 'rgba(128,128,128,0.07)');
        shade(24, 29, 'rgba(239,159,39,0.09)');
        shade(29, 34, 'rgba(29,158,117,0.09)');
    },
};

function ChartSkeleton({ height = 300 }: { height?: number }) {
    return <Skeleton className="w-full rounded-lg" style={{ height }} />;
}

export default function Challenge1() {
    const [data, setData] = useState<EnergyData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        energyApi.c1
            .data()
            .then((d) => setData(d as EnergyData))
            .catch((e) => setError(e.message));
    }, []);

    const mix = data?.mix;
    const score = data?.transition_score;
    const elec = data?.electricity;
    const ghg = data?.ghg;

    const mixConfig = useMemo(() => {
        if (!mix) return null;
        return {
            type: 'line' as const,
            data: {
                labels: mix.years.map(String),
                datasets: [
                    { label: 'Aardgas',      data: mix.gas,       fill: true, backgroundColor: 'rgba(136,135,128,0.80)', borderColor: '#888780', tension: 0.3, pointRadius: 0, borderWidth: 1 },
                    { label: 'Aardolie',     data: mix.oil,       fill: true, backgroundColor: 'rgba(95,94,90,0.75)',    borderColor: '#5F5E5A', tension: 0.3, pointRadius: 0, borderWidth: 1 },
                    { label: 'Kool',         data: mix.coal,      fill: true, backgroundColor: 'rgba(211,209,199,0.85)', borderColor: '#B4B2A9', tension: 0.3, pointRadius: 0, borderWidth: 1 },
                    { label: 'Kernenergie',  data: mix.nuclear,   fill: true, backgroundColor: 'rgba(55,138,221,0.70)',  borderColor: '#378ADD', tension: 0.3, pointRadius: 0, borderWidth: 1 },
                    { label: 'Hernieuwbaar', data: mix.renewable, fill: true, backgroundColor: 'rgba(29,158,117,0.90)',  borderColor: '#0F6E56', tension: 0.3, pointRadius: 0, borderWidth: 1 },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { mode: 'index' as const, intersect: false } },
                scales: {
                    x: { stacked: true, ticks: { autoSkip: true, maxTicksLimit: 9, maxRotation: 0 } },
                    y: { stacked: true, title: { display: true, text: 'PJ' } },
                },
            },
            plugins: [actShadingPlugin],
        };
    }, [mix]);

    const renewableElecConfig = useMemo(() => {
        if (!elec) return null;
        return {
            type: 'line' as const,
            data: {
                labels: elec.years.map(String),
                datasets: [
                    { label: 'Wind',     data: elec.wind,    borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.08)',  fill: true, tension: 0.3, pointRadius: 2.5, borderWidth: 2 },
                    { label: 'Zon',      data: elec.solar,   borderColor: '#639922', backgroundColor: 'rgba(99,153,34,0.08)',   fill: true, tension: 0.3, pointRadius: 2.5, borderWidth: 2 },
                    { label: 'Biomassa', data: elec.biomass, borderColor: '#9FE1CB', backgroundColor: 'rgba(159,225,203,0.06)', fill: true, tension: 0.3, pointRadius: 2.5, borderWidth: 2 },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { mode: 'index' as const, intersect: false } },
                scales: {
                    x: { ticks: { autoSkip: true, maxTicksLimit: 9, maxRotation: 0 } },
                    y: { title: { display: true, text: 'PJ' } },
                },
            },
        };
    }, [elec]);

    const scoreConfig = useMemo(() => {
        if (!score) return null;
        return {
            type: 'bar' as const,
            data: {
                labels: score.years.map(String),
                datasets: [{
                    label: 'Transition score',
                    data: score.score,
                    backgroundColor: score.score.map((v) => v >= 0 ? 'rgba(29,158,117,0.80)' : 'rgba(226,75,74,0.70)'),
                    borderColor:     score.score.map((v) => v >= 0 ? '#0F6E56'               : '#A32D2D'),
                    borderWidth: 1,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { mode: 'index' as const, intersect: false } },
                scales: {
                    x: { ticks: { autoSkip: true, maxTicksLimit: 9, maxRotation: 0 } },
                    y: { title: { display: true, text: 'PJ/yr' } },
                },
            },
        };
    }, [score]);

    const ghgConfig = useMemo(() => {
        if (!ghg) return null;
        return {
            type: 'line' as const,
            data: {
                labels: ghg.years.map(String),
                datasets: [
                    { label: 'Werkelijke uitstoot', data: ghg.total,  borderColor: '#E24B4A', backgroundColor: 'rgba(226,75,74,0.10)', fill: true,  tension: 0.3, pointRadius: 2 },
                    { label: 'Vereist tempo',        data: ghg.target, borderColor: '#1D9E75', borderDash: [7, 4], borderWidth: 2,       fill: false, pointRadius: 0 },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { mode: 'index' as const, intersect: false } },
                scales: {
                    x: { ticks: { autoSkip: true, maxTicksLimit: 9, maxRotation: 0 } },
                    y: { min: 80, max: 260, title: { display: true, text: 'Mton CO₂-eq' } },
                },
            },
        };
    }, [ghg]);

    // Computed metrics from live data
    const renewableShare1990 = mix ? `${mix.renewable_share_pct[0]}%` : '—';
    const renewableShare2015 = mix ? `${mix.renewable_share_pct[25]}%` : '—';
    const renewableShare2024 = mix ? `${mix.renewable_share_pct[mix.renewable_share_pct.length - 1]}%` : '—';
    const ghgReduction = ghg
        ? `${Math.round((1 - ghg.total[ghg.total.length - 1] / ghg.total[0]) * 100) * -1}%`
        : '—';

    const metricCards = [
        { label: 'Renewable share 1990', value: renewableShare1990, color: 'text-muted-foreground' },
        { label: 'Renewable share 2015', value: renewableShare2015, color: 'text-muted-foreground' },
        { label: 'Renewable share 2024', value: renewableShare2024, color: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Electricity renewable 2024', value: '49.9%', color: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'GHG reduction vs 1990', value: ghgReduction, color: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'GHG target 2030', value: '102 Mton', color: 'text-amber-600 dark:text-amber-400' },
    ];

    return (
        <>
            <Head title="Challenge 1 — The Turning Point" />

            <div className="flex flex-col gap-6 p-4">
                {/* Narrative header */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="mb-3">
                            <Badge variant="secondary">Challenge 1 · Beginner–Intermediate</Badge>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">
                            When did the Dutch energy transition really begin?
                        </h1>
                        <p className="text-muted-foreground mb-4">
                            Using 35 years of CBS data to identify the turning point, measure momentum, and assess
                            the 2030 trajectory. Source: CBS Statline — Energie en broeikasgassen 1990–2024.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="rounded-full px-3 py-1 text-xs bg-muted text-muted-foreground">Act 1: Fossil era 1990–2014</span>
                            <span className="rounded-full px-3 py-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Act 2: Turning point 2015–2019</span>
                            <span className="rounded-full px-3 py-1 text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">Act 3: New reality 2020–2024</span>
                        </div>
                    </CardContent>
                </Card>

                {error && (
                    <div className="border-l-4 border-red-400 bg-red-50 px-4 py-3 rounded-r-lg text-sm text-red-900 dark:bg-red-950 dark:text-red-200 dark:border-red-600">
                        <strong>API error:</strong> {error}. Is the Python API running? (<code>composer run dev</code>)
                    </div>
                )}

                {/* Metric cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    {metricCards.map((m) => (
                        <Card key={m.label}>
                            <CardContent className="pt-4 pb-4">
                                <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                                {data ? (
                                    <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                                ) : (
                                    <Skeleton className="h-8 w-16 mt-1" />
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Hero chart: energy mix */}
                <Card>
                    <CardHeader>
                        <CardTitle>Dutch total energy consumption by source, 1990–2024</CardTitle>
                        <p className="text-sm text-muted-foreground">Domestic consumption (PJ) — CBS Tabel 1b</p>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                            {[
                                { color: '#888780', label: 'Aardgas' },
                                { color: '#5F5E5A', label: 'Aardolie' },
                                { color: '#B4B2A9', label: 'Kool' },
                                { color: '#378ADD', label: 'Kernenergie' },
                                { color: '#0F6E56', label: 'Hernieuwbaar' },
                            ].map(({ color, label }) => (
                                <span key={label} className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color }} />
                                    {label}
                                </span>
                            ))}
                        </div>
                        {mixConfig ? <EnergyChart config={mixConfig} height={340} /> : <ChartSkeleton height={340} />}
                        <div className="mt-4 border-l-4 border-amber-400 bg-amber-50 px-4 py-3 rounded-r-lg text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-600">
                            <strong>De gasval:</strong> Hernieuwbaar groeide 13× sinds 1990, maar aardgas vertegenwoordigt
                            nog steeds 36% van het totale energieverbruik in 2024. De elektriciteitssector transformeert
                            snel — maar verwarming en industrie blijven afhankelijk van gas.
                        </div>
                    </CardContent>
                </Card>

                {/* Two-column */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Electricity production by renewable source, 2000–2024</CardTitle>
                            <p className="text-sm text-muted-foreground">Bruto elektriciteitsproductie (PJ) — CBS Tabel 5</p>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                                {[{ color: '#1D9E75', label: 'Wind' }, { color: '#639922', label: 'Zon' }, { color: '#9FE1CB', label: 'Biomassa' }].map(({ color, label }) => (
                                    <span key={label} className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color }} />
                                        {label}
                                    </span>
                                ))}
                            </div>
                            {renewableElecConfig ? <EnergyChart config={renewableElecConfig} height={260} /> : <ChartSkeleton height={260} />}
                            <div className="mt-4 border-l-4 border-emerald-400 bg-emerald-50 px-4 py-3 rounded-r-lg text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-600">
                                <strong>Zon als verrassing:</strong> 4 PJ in 2015 naar 77 PJ in 2024 — een 19× toename in 9 jaar.
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Annual transition momentum score, 1991–2024</CardTitle>
                            <p className="text-sm text-muted-foreground">ΔRenewable − ΔFossil (PJ/yr) — positief = transitie wint</p>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#0F6E56' }} />Positief</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#A32D2D' }} />Negatief</span>
                            </div>
                            {scoreConfig ? <EnergyChart config={scoreConfig} height={260} /> : <ChartSkeleton height={260} />}
                            <div className="mt-4 border-l-4 border-blue-400 bg-blue-50 px-4 py-3 rounded-r-lg text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-600">
                                <strong>Omslagpunt 2016:</strong> De score wordt positief in 2016 — het datagedreven kantelpunt.
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* GHG vs target */}
                <Card>
                    <CardHeader>
                        <CardTitle>Greenhouse gas emissions vs 2030 target pathway</CardTitle>
                        <p className="text-sm text-muted-foreground">Mton CO₂-equivalent — CBS Tabel 6a + Klimaatakkoord −55% target</p>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#E24B4A' }} />Werkelijke uitstoot</span>
                            <span className="flex items-center gap-1.5"><span className="w-6 border-t-2 border-dashed inline-block" style={{ borderColor: '#1D9E75' }} /><span className="ml-1">Vereist tempo</span></span>
                        </div>
                        {ghgConfig ? <EnergyChart config={ghgConfig} height={300} /> : <ChartSkeleton height={300} />}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3 rounded-r-lg text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-600">
                                <strong>Net op koers:</strong> Recent tempo (~8 Mton/jr) komt overeen met vereisten. Maar 2021 liet een stijging zien — geen marge voor trage jaren.
                            </div>
                            <div className="border-l-4 border-emerald-400 bg-emerald-50 px-4 py-3 rounded-r-lg text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-600">
                                <strong>Wat moet veranderen:</strong> Structurele reducties in industrie, verwarming en landbouw zijn nog niet gerealiseerd.
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Key findings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { n: 1, title: 'Renewables scaled — but only in electricity', body: 'The renewable share of total final energy is 15.5%, not the 50% seen in the electricity sector. Transport and heating are still 84% fossil-dependent.' },
                        { n: 2, title: 'Coal collapsed, gas persisted', body: 'Coal fell 63% from its 2015 peak. Gas declined only 31% and remains the single largest fuel source at 36% of total consumption.' },
                        { n: 3, title: 'The direction is right, pace must double', body: 'Current renewable growth in total energy: ~2 pp/year. Required for 2030 targets: ~4+ pp/year.' },
                    ].map(({ n, title, body }) => (
                        <Card key={n}>
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold flex-shrink-0">{n}</div>
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

Challenge1.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Challenge 1 — The Turning Point', href: '/challenges/1' },
    ],
};
