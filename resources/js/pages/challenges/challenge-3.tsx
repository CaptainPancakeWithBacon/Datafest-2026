import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EnergyChart } from '@/components/energy-chart';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GapAnalysis {
    current_coverage_pct:   number;
    ind_total_tj:           number;
    ren_gen_tj:             number;
    gap_tj:                 number;
    multiplier:             number;
    bau_year_50pct:         number | null;
    bau_year_100pct:        number | null;
    historical: {
        years:        number[];
        ind_tj:       number[];
        ren_gen_tj:   number[];
        coverage_pct: number[];
    };
}

interface SimResult {
    years:          number[];
    ind_total_tj:   number[];
    ind_gas_tj:     number[];
    ind_elec_tj:    number[];
    ind_h2_tj:      number[];
    ren_gen_tj:     number[];
    coverage_pct:   number[];
    fossil_pct:     number[];
    milestones: {
        coverage_25pct:  number | null;
        coverage_50pct:  number | null;
        coverage_100pct: number | null;
        fossil_50pct:    number | null;
        fossil_10pct:    number | null;
    };
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function ChartSkeleton({ height = 260 }: { height?: number }) {
    return <Skeleton className="w-full rounded-lg" style={{ height }} />;
}

function Insight({ color, children }: { color: 'blue' | 'amber' | 'emerald' | 'violet' | 'red'; children: React.ReactNode }) {
    const styles: Record<string, string> = {
        blue:    'border-blue-400 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-600',
        amber:   'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-600',
        emerald: 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-600',
        violet:  'border-violet-400 bg-violet-50 text-violet-900 dark:bg-violet-950 dark:text-violet-200 dark:border-violet-600',
        red:     'border-red-400 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200 dark:border-red-600',
    };
    return <div className={`mt-4 border-l-4 px-4 py-3 rounded-r-lg text-sm ${styles[color]}`}>{children}</div>;
}

function MilestoneChip({ label, year, good }: { label: string; year: number | null; good: boolean }) {
    const cls = good
        ? 'rounded-lg px-3 py-2 text-center bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800'
        : 'rounded-lg px-3 py-2 text-center bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800';
    return (
        <div className={cls}>
            <span className="text-xs text-muted-foreground block">{label}</span>
            <span className={`text-xl font-bold ${good ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>
                {year ?? '2060+'}
            </span>
        </div>
    );
}

function Slider({
    label, value, min, max, step, unit, description, color, onChange,
}: {
    label: string; value: number; min: number; max: number; step: number;
    unit: string; description: string; color: string;
    onChange: (v: number) => void;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-baseline justify-between">
                <label className={`text-sm font-semibold ${color}`}>{label}</label>
                <span className="text-lg font-bold tabular-nums">{value} {unit}</span>
            </div>
            <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full"
            />
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const API = (import.meta as Record<string, Record<string, string>>).env?.VITE_API_URL ?? 'http://localhost:8090';

export default function Challenge3() {
    const [gap, setGap]         = useState<GapAnalysis | null>(null);
    const [result, setResult]   = useState<SimResult | null>(null);
    const [gapLoading, setGapLoading] = useState(true);

    const [renGrowth,  setRenGrowth]  = useState(500);
    const [electrify,  setElectrify]  = useState(1.0);
    const [hydrogen,   setHydrogen]   = useState(0.5);
    const [efficiency, setEfficiency] = useState(1.0);

    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        fetch(`${API}/api/challenge-3/gap-analysis`)
            .then(r => r.json())
            .then(d => { setGap(d); setGapLoading(false); })
            .catch(() => setGapLoading(false));
    }, []);

    useEffect(() => {
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(() => {
            fetch(`${API}/api/challenge-3/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    renewable_growth_tj_per_yr: renGrowth,
                    electrification_pct_per_yr: electrify,
                    hydrogen_pct_per_yr:         hydrogen,
                    efficiency_pct_per_yr:       efficiency,
                    horizon: 2060,
                }),
            })
                .then(r => r.json())
                .then(d => setResult(d as SimResult))
                .catch(() => null);
        }, 200);
        return () => { if (debounce.current) clearTimeout(debounce.current); };
    }, [renGrowth, electrify, hydrogen, efficiency]);

    const m = result?.milestones;
    const coverage2030 = result?.coverage_pct[6]  ?? null;
    const coverage2040 = result?.coverage_pct[16] ?? null;
    const coverage2050 = result?.coverage_pct[26] ?? null;

    // ── Charts ────────────────────────────────────────────────────────────────

    const histConfig = useMemo(() => {
        if (!gap) return null;
        return {
            type: 'line' as const,
            data: {
                labels: gap.historical.years.map(String),
                datasets: [{
                    label: 'Hernieuwbaar dekt % van industrie',
                    data: gap.historical.coverage_pct,
                    borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.12)',
                    fill: true, tension: 0.3, pointRadius: 5, borderWidth: 2,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { mode: 'index' as const, intersect: false } },
                scales: { x: { ticks: { maxRotation: 0 } }, y: { min: 0, max: 15, title: { display: true, text: '%' } } },
            },
        };
    }, [gap]);

    const coverageConfig = useMemo(() => {
        if (!result) return null;
        return {
            type: 'line' as const,
            data: {
                labels: result.years.map(String),
                datasets: [{
                    label: '% van industrieverbruik gedekt door hernieuwbaar',
                    data: result.coverage_pct,
                    borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.12)',
                    fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2.5,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { mode: 'index' as const, intersect: false } },
                scales: {
                    x: { ticks: { maxRotation: 0, maxTicksLimit: 8 } },
                    y: { min: 0, max: 105, title: { display: true, text: '%' } },
                },
            },
        };
    }, [result]);

    const mixConfig = useMemo(() => {
        if (!result) return null;
        const renAsElec  = result.years.map((_, i) => Math.min(result.ren_gen_tj[i], result.ind_elec_tj[i]));
        const fossilElec = result.years.map((_, i) => Math.max(result.ind_elec_tj[i] - result.ren_gen_tj[i], 0));
        return {
            type: 'bar' as const,
            data: {
                labels: result.years.map(String),
                datasets: [
                    { label: 'Aardgas (fossiel)',          data: result.ind_gas_tj, backgroundColor: 'rgba(251,146,60,0.85)', borderWidth: 0 },
                    { label: 'Elektriciteit (fossiel)',    data: fossilElec,         backgroundColor: 'rgba(95,94,90,0.70)',   borderWidth: 0 },
                    { label: 'Elektriciteit (hernieuwb.)', data: renAsElec,          backgroundColor: 'rgba(55,138,221,0.80)', borderWidth: 0 },
                    { label: 'Groene waterstof',           data: result.ind_h2_tj,   backgroundColor: 'rgba(139,92,246,0.85)', borderWidth: 0 },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 10 } } },
                    tooltip: { mode: 'index' as const, intersect: false },
                },
                scales: {
                    x: { stacked: true, ticks: { maxRotation: 0, maxTicksLimit: 8 } },
                    y: { stacked: true, title: { display: true, text: 'TJ' } },
                },
            },
        };
    }, [result]);

    const gapConfig = useMemo(() => {
        if (!result) return null;
        return {
            type: 'line' as const,
            data: {
                labels: result.years.map(String),
                datasets: [
                    { label: 'Industrieel verbruik (TJ)', data: result.ind_total_tj, borderColor: '#ea580c', backgroundColor: 'rgba(251,146,60,0.08)', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2 },
                    { label: 'Hernieuwbare opwek (TJ)',   data: result.ren_gen_tj,   borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.20)',   fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2 },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 11 } } },
                    tooltip: { mode: 'index' as const, intersect: false },
                },
                scales: {
                    x: { ticks: { maxRotation: 0, maxTicksLimit: 8 } },
                    y: { title: { display: true, text: 'TJ' } },
                },
            },
        };
    }, [result]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <Head title="Challenge 3 — Industriekloof" />
            <div className="flex flex-col gap-6 p-4">

                {/* Header */}
                <Card className="border-violet-200 dark:border-violet-900">
                    <CardContent className="pt-6">
                        <div className="mb-3 flex flex-wrap gap-2">
                            <Badge variant="secondary">Challenge 3 · Intermediate–Advanced</Badge>
                            <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200 border-0">Scenario simulator</Badge>
                            <Badge variant="outline">Antwoord op Challenge 2</Badge>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">
                            De industriekloof dichten — wanneer en hoe?
                        </h1>
                        <p className="text-muted-foreground max-w-3xl">
                            Challenge 2 toonde de kloof: Zeeuwse industrie verbruikt ~75 PJ/jaar terwijl alle
                            hernieuwbare opwek samen slechts 7 PJ levert — 10× te weinig. Bij huidig tempo
                            bereikt de dekking de 50%-grens pas in <strong>{gap?.bau_year_50pct ?? '2107'}</strong>.
                            Stel hieronder in hoe ambitieus Zeeland en de industrie investeren.
                        </p>
                    </CardContent>
                </Card>

                {/* Starting point */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historische dekking 2010–2024 (%)</CardTitle>
                            <p className="text-sm text-muted-foreground">Hernieuwbaar als % van industrieel verbruik · startpunt voor de simulator</p>
                        </CardHeader>
                        <CardContent>
                            {histConfig ? <EnergyChart config={histConfig} height={220} /> : <ChartSkeleton height={220} />}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Situatie bij ongewijzigd beleid</CardTitle></CardHeader>
                        <CardContent>
                            {gapLoading ? <Skeleton className="h-32 w-full" /> : gap && (
                                <>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="rounded-lg bg-muted px-3 py-2 text-center">
                                            <p className="text-xs text-muted-foreground">Dekking 2024</p>
                                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{gap.current_coverage_pct}%</p>
                                        </div>
                                        <div className="rounded-lg bg-muted px-3 py-2 text-center">
                                            <p className="text-xs text-muted-foreground">50% bij BAU</p>
                                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{gap.bau_year_50pct ?? '2100+'}</p>
                                        </div>
                                        <div className="rounded-lg bg-muted px-3 py-2 text-center">
                                            <p className="text-xs text-muted-foreground">Kloof (PJ)</p>
                                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{Math.round(gap.gap_tj / 1000)} PJ</p>
                                        </div>
                                    </div>
                                    <Insight color="red">
                                        <strong>BAU = falen:</strong> Bij het huidige groeitempo bereikt de hernieuwbare
                                        dekking pas in <strong>{gap.bau_year_50pct ?? '2107'}</strong> de 50%-grens.
                                        Pas de levers hieronder aan om te zien wat nodig is voor een realistisch pad.
                                    </Insight>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Levers */}
                <Card className="border-violet-200 dark:border-violet-800">
                    <CardHeader>
                        <CardTitle>Stel de transitielevers in</CardTitle>
                        <p className="text-sm text-muted-foreground">Pas elk lever aan — de grafieken updaten direct</p>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Slider label="Groei hernieuwbare opwek" value={renGrowth} min={0} max={5000} step={100} unit="TJ/jr"
                                color="text-emerald-600 dark:text-emerald-400"
                                description="Extra wind- en zonnecapaciteit per jaar (5.000 TJ ≈ 1.400 MW wind)"
                                onChange={setRenGrowth} />
                            <Slider label="Elektrificatiesnelheid industrie" value={electrify} min={0} max={5} step={0.5} unit="%/jr"
                                color="text-blue-600 dark:text-blue-400"
                                description="% resterende gasvraag dat jaarlijks wordt omgezet naar elektriciteit"
                                onChange={setElectrify} />
                            <Slider label="Groene waterstof substitutie" value={hydrogen} min={0} max={4} step={0.5} unit="%/jr"
                                color="text-violet-600 dark:text-violet-400"
                                description="% gasvraag dat jaarlijks vervangen wordt door groene waterstof (H₂)"
                                onChange={setHydrogen} />
                            <Slider label="Energie-efficiëntie verbetering" value={efficiency} min={0} max={3} step={0.5} unit="%/jr"
                                color="text-amber-600 dark:text-amber-400"
                                description="% jaarlijkse reductie van totale industriële energievraag"
                                onChange={setEfficiency} />
                        </div>
                    </CardContent>
                </Card>

                {/* Milestones */}
                {result && (
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">Mijlpalen met huidige instellingen</p>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                            {([
                                { label: 'Dekking 2030', val: coverage2030, good: (coverage2030 ?? 0) >= 20 },
                                { label: 'Dekking 2040', val: coverage2040, good: (coverage2040 ?? 0) >= 50 },
                                { label: 'Dekking 2050', val: coverage2050, good: (coverage2050 ?? 0) >= 80 },
                            ] as const).map(({ label, val, good }) => (
                                <div key={label} className={`rounded-lg px-3 py-2 text-center ${good ? 'bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800' : 'bg-muted'}`}>
                                    <span className="text-xs text-muted-foreground block">{label}</span>
                                    <span className={`text-2xl font-bold ${good ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}>{val?.toFixed(1)}%</span>
                                </div>
                            ))}
                            <MilestoneChip label="Bereikt 25%" year={m?.coverage_25pct ?? null} good={(m?.coverage_25pct ?? 9999) <= 2035} />
                            <MilestoneChip label="Bereikt 50%" year={m?.coverage_50pct ?? null} good={(m?.coverage_50pct ?? 9999) <= 2045} />
                        </div>
                    </div>
                )}

                {/* Coverage projection */}
                <Card>
                    <CardHeader>
                        <CardTitle>Hernieuwbare dekking van industrieverbruik — projectie 2024–2060 (%)</CardTitle>
                        <p className="text-sm text-muted-foreground">Resultaat van jouw leverinstellingen</p>
                    </CardHeader>
                    <CardContent>
                        {coverageConfig ? <EnergyChart config={coverageConfig} height={300} /> : <ChartSkeleton height={300} />}
                        {result && m && (
                            <Insight color={m.coverage_50pct && m.coverage_50pct <= 2045 ? 'emerald' : 'amber'}>
                                {m.coverage_50pct && m.coverage_50pct <= 2045
                                    ? <><strong>Op koers:</strong> Met deze instellingen bereikt Zeeland de 50%-drempel in <strong>{m.coverage_50pct}</strong>. Dit vereist politieke wil én industriële investeringsbereidheid op alle vier de levers tegelijk.</>
                                    : <><strong>Niet op koers:</strong> De 50%-drempel wordt {m.coverage_50pct ? `pas in ${m.coverage_50pct}` : 'vóór 2060 niet'} gehaald. Zet meerdere levers hoger voor een realistisch klimaatpad.</>
                                }
                            </Insight>
                        )}
                    </CardContent>
                </Card>

                {/* Mix + gap */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Energiemix industrie — projectie (TJ)</CardTitle>
                            <p className="text-sm text-muted-foreground">Gas (oranje) krimpt · blauw en paars nemen het over</p>
                        </CardHeader>
                        <CardContent>
                            {mixConfig ? <EnergyChart config={mixConfig} height={280} /> : <ChartSkeleton height={280} />}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>De kloof — industrie vs opwek (TJ)</CardTitle>
                            <p className="text-sm text-muted-foreground">Groen raakt oranje = kloof gedicht</p>
                        </CardHeader>
                        <CardContent>
                            {gapConfig ? <EnergyChart config={gapConfig} height={280} /> : <ChartSkeleton height={280} />}
                        </CardContent>
                    </Card>
                </div>

                {/* Conclusions */}
                <Card>
                    <CardHeader><CardTitle>Wat leert de simulator?</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                {
                                    title: '⚡ Elektrificatie is de hefboom',
                                    body: 'Zet de elektrificatielever op 0% en geen enkele hoeveelheid extra opwek dicht de kloof snel — gas blijft domineren. Elektrificatie is de sleutelintervenetie: het verplaatst de gasvraag naar het elektriciteitsnet waar hernieuwbaar het kan overnemen.',
                                    color: 'text-blue-600 dark:text-blue-400',
                                },
                                {
                                    title: '🔬 Waterstof dicht wat elektriciteit niet kan',
                                    body: 'Voor hoge-temperatuurprocessen en chemische feedstock is elektriciteit geen optie. Groene H₂ is de enige serieuze optie voor die resterende gasvraag. Zonder waterstof blijft er altijd een onoverbrugbare fossiele restpost.',
                                    color: 'text-violet-600 dark:text-violet-400',
                                },
                                {
                                    title: '📉 Efficiëntie krimpt het probleem',
                                    body: 'Elke % minder energievraag maakt het dekkingsdoel proportioneel makkelijker. Efficiëntiemaatregelen zijn doorgaans goedkoper dan nieuwe opwekcapaciteit en worden systematisch onderschat in scenario\'s.',
                                    color: 'text-amber-600 dark:text-amber-400',
                                },
                            ].map(({ title, body, color }) => (
                                <div key={title} className="space-y-2">
                                    <p className={`text-sm font-semibold ${color}`}>{title}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

            </div>
        </>
    );
}

Challenge3.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Challenge 3 — Industriekloof', href: '/challenges/3' },
    ],
};
