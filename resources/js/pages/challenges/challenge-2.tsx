import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { EnergyChart } from '@/components/energy-chart';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { energyApi } from '@/hooks/use-energy-api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Series {
    years: number[];
    values: (number | null)[];
    unit: string;
}

interface StedinCity {
    elk_kwh:   (number | null)[];
    gas_m3:    (number | null)[];
    solar_pct: (number | null)[];
    smart_pct: (number | null)[];
}

interface StedinSlope {
    slope_kwh_per_year:  number;
    pct_change_per_year: number;
    val_2013:            number;
    val_latest:          number;
    year_to_minus20pct:  number | null;
}

interface StedinData {
    overview: {
        year_range: [number, number];
        years_available: number[];
        total_elk_connections: number;
        unique_postcodes: number;
        unique_cities: number;
        top_cities: string[];
    };
    years: number[];
    elk_trend:    { years: number[]; values: (number | null)[] };
    gas_trend:    { years: number[]; values: (number | null)[] };
    solar_global: { years: number[]; values: (number | null)[] };
    cities: Record<string, StedinCity>;
    slopes: Record<string, StedinSlope>;
}

interface C2Data {
    years: number[];
    dv1_total: { total: Series; renewable: Series; fossil: Series; ren_share: Series };
    dv2_sectors: { gebouwde_omgeving: Series; industrie: Series; landbouw: Series; mobiliteit: Series };
    dv2_indexed: { gebouwde_omgeving: Series; industrie: Series; landbouw: Series; mobiliteit: Series };
    dv3_fossil_renewable: { renewable_elec_tj: Series; renewable_total: Series; fossil: Series; share_pct: Series };
    dv3_capacity:   { wind: Series; solar_dak: Series; solar_veld: Series };
    dv3_generation: { wind: Series; solar_dak: Series; solar_veld: Series };
    industrie_diepgang: {
        gas:  Series;
        elec: Series;
        total: Series;
        renewable_gen_total:      Series;
        renewable_coverage_pct:   Series;
        share_of_sectors_pct:     Series;
    };
}

// ── Shared components ─────────────────────────────────────────────────────────

function ChartSkeleton({ height = 260 }: { height?: number }) {
    return <Skeleton className="w-full rounded-lg" style={{ height }} />;
}

function StatCard({
    label, value, sub, color = '', size = 'md',
}: {
    label: string; value: string; sub?: string; color?: string; size?: 'md' | 'lg';
}) {
    return (
        <Card>
            <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className={`font-bold ${size === 'lg' ? 'text-4xl' : 'text-2xl'} ${color || 'text-foreground'}`}>{value}</p>
                {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </CardContent>
        </Card>
    );
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

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-4 my-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">{label}</span>
            <div className="flex-1 h-px bg-border" />
        </div>
    );
}

const SECTOR_COLORS = {
    industrie:         { fill: 'rgba(251,146,60,0.85)',  border: '#ea580c' },
    mobiliteit:        { fill: 'rgba(95,94,90,0.75)',    border: '#5F5E5A' },
    gebouwde_omgeving: { fill: 'rgba(55,138,221,0.70)',  border: '#378ADD' },
    landbouw:          { fill: 'rgba(29,158,117,0.80)',  border: '#1D9E75' },
};

const CITY_PALETTE = [
    '#378ADD','#1D9E75','#F59E0B','#EF4444','#8B5CF6','#EC4899',
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Challenge2() {
    const [data, setData]       = useState<C2Data | null>(null);
    const [error, setError]     = useState<string | null>(null);
    const [stedin, setStedin]   = useState<StedinData | null>(null);
    const [stedinErr, setStedinErr] = useState<string | null>(null);

    useEffect(() => {
        energyApi.c2.data()  .then(d => setData(d as C2Data))  .catch(e => setError(e.message));
        energyApi.c2.stedin().then(d => setStedin(d as StedinData)).catch(e => setStedinErr(e.message));
    }, []);

    // ── Derived values ────────────────────────────────────────────────────────
    const ind  = data?.industrie_diepgang;
    const dv1  = data?.dv1_total;
    const dv2  = data?.dv2_sectors;
    const dv2i = data?.dv2_indexed;
    const dv3  = data?.dv3_fossil_renewable;
    const cap  = data?.dv3_capacity;
    const gen  = data?.dv3_generation;

    const last  = (v: (number | null)[] | undefined) => v?.slice().reverse().find(x => x !== null) ?? null;
    const first = (v: (number | null)[] | undefined) => v?.find(x => x !== null) ?? null;
    const drop  = (a: number | null, b: number | null) => a && b ? Math.round((1 - b / a) * 100) : null;

    const indFirst      = first(ind?.total.values);
    const indLast       = last(ind?.total.values);
    const renGenLast    = last(ind?.renewable_gen_total.values);
    const coverageLast  = last(ind?.renewable_coverage_pct.values);
    const shareLast     = last(ind?.share_of_sectors_pct.values);
    const gasRatio      = ind ? Math.round((ind.gas.values[0] ?? 0) / (ind.elec.values[0] ?? 1)) : null;

    const totalFirst    = first(dv1?.total.values);
    const totalLast     = last(dv1?.total.values);
    const totalDrop     = drop(totalFirst, totalLast);
    const renShareFirst = first(dv3?.share_pct.values);
    const renShareLast  = last(dv3?.share_pct.values);
    const windCap2010   = first(cap?.wind.values);
    const windCap2024   = last(cap?.wind.values);
    const solarCap2024  = (last(cap?.solar_dak.values) ?? 0) + (last(cap?.solar_veld.values) ?? 0);

    // ── Chart configs ─────────────────────────────────────────────────────────

    // THE GAP — industry vs renewables on same scale
    const gapConfig = useMemo(() => {
        if (!ind) return null;
        return {
            type: 'bar' as const,
            data: {
                labels: ind.total.years.map(String),
                datasets: [
                    {
                        label: 'Industrieel verbruik (TJ)',
                        data: ind.total.values,
                        backgroundColor: 'rgba(251,146,60,0.80)',
                        borderColor: '#ea580c', borderWidth: 1,
                    },
                    {
                        label: 'Alle hernieuwbare opwek Zeeland (TJ)',
                        data: ind.renewable_gen_total.values,
                        backgroundColor: 'rgba(29,158,117,0.90)',
                        borderColor: '#0F6E56', borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 11 } } },
                    tooltip: { mode: 'index' as const, intersect: false },
                },
                scales: { x: { ticks: { maxRotation: 0 } }, y: { title: { display: true, text: 'TJ' } } },
            },
        };
    }, [ind]);

    // Coverage %
    const coverageConfig = useMemo(() => {
        if (!ind) return null;
        return {
            type: 'line' as const,
            data: {
                labels: ind.renewable_coverage_pct.years.map(String),
                datasets: [{
                    label: '% van industrieverbruik gedekt',
                    data: ind.renewable_coverage_pct.values,
                    borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.12)',
                    fill: true, tension: 0.3, pointRadius: 4, borderWidth: 2, spanGaps: false,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { mode: 'index' as const, intersect: false } },
                scales: { x: { ticks: { maxRotation: 0 } }, y: { min: 0, max: 15, title: { display: true, text: '%' } } },
            },
        };
    }, [ind]);

    // Industry gas vs elec
    const gasElecConfig = useMemo(() => {
        if (!ind) return null;
        return {
            type: 'bar' as const,
            data: {
                labels: ind.gas.years.map(String),
                datasets: [
                    { label: 'Aardgas',       data: ind.gas.values,  backgroundColor: 'rgba(251,146,60,0.85)', borderColor: '#ea580c', borderWidth: 1 },
                    { label: 'Elektriciteit', data: ind.elec.values, backgroundColor: 'rgba(55,138,221,0.80)', borderColor: '#378ADD', borderWidth: 1 },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { mode: 'index' as const, intersect: false } },
                scales: { x: { stacked: true, ticks: { maxRotation: 0 } }, y: { stacked: true, title: { display: true, text: 'TJ' } } },
            },
        };
    }, [ind]);

    // Industry share % (flat line showing stubborn dominance)
    const shareConfig = useMemo(() => {
        if (!ind) return null;
        return {
            type: 'line' as const,
            data: {
                labels: ind.share_of_sectors_pct.years.map(String),
                datasets: [{
                    label: 'Industrie % van sectoraal verbruik',
                    data: ind.share_of_sectors_pct.values,
                    borderColor: '#ea580c', backgroundColor: 'rgba(251,146,60,0.12)',
                    fill: true, tension: 0.2, pointRadius: 4, borderWidth: 2, spanGaps: false,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { mode: 'index' as const, intersect: false } },
                scales: { x: { ticks: { maxRotation: 0 } }, y: { min: 50, max: 100, title: { display: true, text: '%' } } },
            },
        };
    }, [ind]);

    // All sectors stacked bar (context — showing industry's colour dominates)
    const sectorsConfig = useMemo(() => {
        if (!dv2) return null;
        return {
            type: 'bar' as const,
            data: {
                labels: dv2.industrie.years.map(String),
                datasets: [
                    { label: 'Industrie',        data: dv2.industrie.values,         backgroundColor: SECTOR_COLORS.industrie.fill,         borderColor: SECTOR_COLORS.industrie.border,         borderWidth: 1 },
                    { label: 'Mobiliteit',       data: dv2.mobiliteit.values,        backgroundColor: SECTOR_COLORS.mobiliteit.fill,        borderColor: SECTOR_COLORS.mobiliteit.border,        borderWidth: 1 },
                    { label: 'Gebouwde omgeving',data: dv2.gebouwde_omgeving.values, backgroundColor: SECTOR_COLORS.gebouwde_omgeving.fill, borderColor: SECTOR_COLORS.gebouwde_omgeving.border, borderWidth: 1 },
                    { label: 'Landbouw',         data: dv2.landbouw.values,          backgroundColor: SECTOR_COLORS.landbouw.fill,          borderColor: SECTOR_COLORS.landbouw.border,          borderWidth: 1 },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { mode: 'index' as const, intersect: false } },
                scales: { x: { stacked: true, ticks: { maxRotation: 0 } }, y: { stacked: true, title: { display: true, text: 'TJ' } } },
            },
        };
    }, [dv2]);

    // Renewable capacity buildout
    const capacityConfig = useMemo(() => {
        if (!cap) return null;
        return {
            type: 'bar' as const,
            data: {
                labels: cap.wind.years.map(String),
                datasets: [
                    { label: 'Wind',     data: cap.wind.values,       backgroundColor: 'rgba(55,138,221,0.85)', borderColor: '#378ADD', borderWidth: 1 },
                    { label: 'Zon — dak', data: cap.solar_dak.values,  backgroundColor: 'rgba(251,191,36,0.85)', borderColor: '#d97706', borderWidth: 1 },
                    { label: 'Zon — veld',data: cap.solar_veld.values, backgroundColor: 'rgba(251,146,60,0.75)', borderColor: '#ea580c', borderWidth: 1 },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { mode: 'index' as const, intersect: false } },
                scales: { x: { stacked: true, ticks: { maxRotation: 0 } }, y: { stacked: true, title: { display: true, text: 'MW' } } },
            },
        };
    }, [cap]);

    // Stedin electricity trend
    const elkConfig = useMemo(() => {
        if (!stedin) return null;
        const cities = stedin.overview.top_cities.slice(0, 5);
        return {
            type: 'line' as const,
            data: {
                labels: stedin.years.map(String),
                datasets: [
                    { label: 'Zeeland gem.', data: stedin.elk_trend.values, borderColor: '#1e293b', backgroundColor: 'transparent', borderWidth: 3, borderDash: [5, 3], pointRadius: 3, tension: 0.3, spanGaps: false },
                    ...cities.map((c, i) => ({ label: c, data: stedin.cities[c]?.elk_kwh ?? [], borderColor: CITY_PALETTE[i], backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 2, tension: 0.3, spanGaps: false })),
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { mode: 'index' as const, intersect: false } },
                scales: { x: { ticks: { maxRotation: 0 } }, y: { title: { display: true, text: 'kWh / aansluiting' } } },
            },
        };
    }, [stedin]);

    // Stedin solar adoption
    const solarConfig = useMemo(() => {
        if (!stedin) return null;
        const cities = stedin.overview.top_cities.slice(0, 5);
        return {
            type: 'line' as const,
            data: {
                labels: stedin.years.map(String),
                datasets: [
                    { label: 'Zeeland gem.', data: stedin.solar_global.values, borderColor: '#1e293b', backgroundColor: 'rgba(30,41,59,0.07)', borderWidth: 3, borderDash: [5, 3], pointRadius: 3, fill: true, tension: 0.3, spanGaps: false },
                    ...cities.map((c, i) => ({ label: c, data: stedin.cities[c]?.solar_pct ?? [], borderColor: CITY_PALETTE[i], backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 2, tension: 0.3, spanGaps: false })),
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { mode: 'index' as const, intersect: false } },
                scales: { x: { ticks: { maxRotation: 0 } }, y: { min: 0, title: { display: true, text: '%' } } },
            },
        };
    }, [stedin]);

    const loading = !data;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <Head title="Challenge 2 — Zeeland Industrie" />
            <div className="flex flex-col gap-6 p-4">

                {/* ── Header ── */}
                <Card className="border-orange-200 dark:border-orange-900">
                    <CardContent className="pt-6">
                        <div className="mb-3 flex flex-wrap gap-2">
                            <Badge variant="secondary">Challenge 2 · Beginner–Intermediate</Badge>
                            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-0">Zeeland · Industrie-focus</Badge>
                            <Badge variant="outline">Klimaatmonitor + Stedin · 2010–2025</Badge>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">
                            Zeeland's industriële energiemuur
                        </h1>
                        <p className="text-muted-foreground mb-4 max-w-3xl">
                            Zeeland is de meest industrie-intensieve provincie van Nederland. De industrie verbruikt
                            driekwart van alle energie — terwijl alle hernieuwbare opwek van Zeeland samen nog geen
                            10% van dat verbruik dekt. Dit dashboard volgt die kloof, en vraagt: wanneer slaan de
                            investeringen in wind en zon écht aan?
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-muted-foreground">
                            {[
                                ['DV1', 'Hoe groot is de kloof tussen industrieel verbruik en hernieuwbare opwek?'],
                                ['DV2', 'Wat is de samenstelling van het industrieverbruik (gas vs elektriciteit)?'],
                                ['DV3', 'Hoe heeft het aandeel van de industrie in het totaal zich ontwikkeld?'],
                                ['DV4', 'Hoe snel groeit de hernieuwbare dekking, en wat is er nodig om de kloof te dichten?'],
                            ].map(([label, q]) => (
                                <p key={label} className="flex gap-2">
                                    <span className="font-semibold text-foreground shrink-0">{label}</span>{q}
                                </p>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {error && (
                    <div className="border-l-4 border-red-400 bg-red-50 px-4 py-3 rounded-r-lg text-sm text-red-900 dark:bg-red-950 dark:text-red-200">
                        <strong>API error:</strong> {error}
                    </div>
                )}

                {/* ── Hero metrics ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {loading ? [1,2,3,4].map(i => <Card key={i}><CardContent className="pt-4 pb-4"><Skeleton className="h-10 w-24 mt-1" /></CardContent></Card>) : <>
                        <StatCard
                            label="Industrie aandeel 2024"
                            value={shareLast !== null ? `${shareLast}%` : '—'}
                            sub="van alle sectoren · nauwelijks gedaald"
                            color="text-orange-600 dark:text-orange-400"
                            size="lg"
                        />
                        <StatCard
                            label="Industrieel verbruik 2024"
                            value={indLast ? `${Math.round(indLast / 1000)} PJ` : '—'}
                            sub={indFirst ? `${Math.round(indFirst / 1000)} PJ in 2010 (−${drop(indFirst, indLast)}%)` : ''}
                            color="text-orange-600 dark:text-orange-400"
                            size="lg"
                        />
                        <StatCard
                            label="Hernieuwbare opwek 2024"
                            value={renGenLast ? `${Math.round(renGenLast / 1000)} PJ` : '—'}
                            sub="wind + zon totaal Zeeland"
                            color="text-emerald-600 dark:text-emerald-400"
                            size="lg"
                        />
                        <StatCard
                            label="Dekt industrie voor..."
                            value={coverageLast !== null ? `${coverageLast}%` : '—'}
                            sub="hernieuwbaar t.o.v. industrieverbruik"
                            color="text-red-600 dark:text-red-400"
                            size="lg"
                        />
                    </>}
                </div>

                {/* ── DV1 — The Gap ── */}
                <Card>
                    <CardHeader>
                        <CardTitle>DV1 — De kloof: industrieel verbruik vs hernieuwbare opwek (TJ)</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Beide op dezelfde schaal — dit is het kernprobleem van de Zeeuwse energietransitie
                        </p>
                    </CardHeader>
                    <CardContent>
                        {gapConfig ? <EnergyChart config={gapConfig} height={340} /> : <ChartSkeleton height={340} />}
                        {ind && renGenLast && indLast && (
                            <Insight color="red">
                                <strong>De harde realiteit:</strong> In 2024 wekt Zeeland ~{Math.round(renGenLast / 1000)} PJ hernieuwbaar op.
                                De industrie alleen al verbruikt ~{Math.round(indLast / 1000)} PJ —{' '}
                                <strong>{Math.round(indLast / renGenLast)}× meer</strong>.
                                Zelfs als wind- en zonnecapaciteit morgen verdrievoudigt, dekt het nog geen kwart van de industriële vraag.
                                Groene waterstof en industriële elektrificatie zijn onvermijdelijk.
                            </Insight>
                        )}
                    </CardContent>
                </Card>

                {/* ── DV2 + DV3 side by side ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>DV2 — Industrieel verbruik: gas vs elektriciteit</CardTitle>
                            <p className="text-sm text-muted-foreground">Gas domineert; elektrificatie is nauwelijks op gang</p>
                        </CardHeader>
                        <CardContent>
                            {gasElecConfig ? <EnergyChart config={gasElecConfig} height={280} /> : <ChartSkeleton height={280} />}
                            {ind && gasRatio && (
                                <Insight color="amber">
                                    <strong>Gas:{gasRatio}:1</strong> De verhouding gas:elektriciteit was {gasRatio}:1 in 2010.
                                    Processwarmte op aardgas is het hart van de Zeeuwse chemische industrie —
                                    dit vervangen vraagt massale investering in groene waterstof of industriële warmtepompen.
                                </Insight>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>DV3 — Industrie als aandeel van alle sectoren (%)</CardTitle>
                            <p className="text-sm text-muted-foreground">Ondanks absolute daling: aandeel blijft structureel 72–77%</p>
                        </CardHeader>
                        <CardContent>
                            {shareConfig ? <EnergyChart config={shareConfig} height={280} /> : <ChartSkeleton height={280} />}
                            <Insight color="amber">
                                <strong>Structureel dominant:</strong> De industrie daalde in absolute termen, maar
                                de andere sectoren ook. Het aandeel bleef vrijwel constant op 72–77%.
                                Zeeland is een provinciale outlier — gemiddeld is dat nationaal ~40%.
                            </Insight>
                        </CardContent>
                    </Card>
                </div>

                {/* ── DV4 — Coverage growing but tiny ── */}
                <Card>
                    <CardHeader>
                        <CardTitle>DV4 — Groeiende hernieuwbare dekking van industrieverbruik (%)</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Dekking groeide van 1,3% (2010) naar 9,3% (2024) — indrukwekkend tempo, onthutsende schaal
                        </p>
                    </CardHeader>
                    <CardContent>
                        {coverageConfig ? <EnergyChart config={coverageConfig} height={260} /> : <ChartSkeleton height={260} />}
                        <Insight color="violet">
                            <strong>Extrapolatie:</strong> Op het huidige groeitempo van ~0,6 procentpunt per jaar
                            bereikt de hernieuwbare dekking van de industrie pas rond 2090 de 50%-grens.
                            Versnelling vereist systeemverandering: elektrificatie van industriële processen,
                            groene waterstof en carbon capture — niet alleen meer panelen.
                        </Insight>
                    </CardContent>
                </Card>

                {/* ── Context: all sectors ── */}
                <SectionDivider label="Context — alle sectoren" />

                <Card>
                    <CardHeader>
                        <CardTitle>Energieverbruik per sector, Zeeland 2010–2024 (TJ)</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            De oranje blok is de industrie — alles wat je boven die oranje laag ziet is de rest samen
                        </p>
                    </CardHeader>
                    <CardContent>
                        {sectorsConfig ? <EnergyChart config={sectorsConfig} height={300} /> : <ChartSkeleton height={300} />}
                    </CardContent>
                </Card>

                {/* ── Context: renewable buildout ── */}
                <SectionDivider label="Hernieuwbare investeringen" />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {loading ? [1,2,3,4].map(i => <Card key={i}><CardContent className="pt-4 pb-4"><Skeleton className="h-8 w-20 mt-1" /></CardContent></Card>) : <>
                        <StatCard label="Wind 2010" value={windCap2010 ? `${Math.round(windCap2010)} MW` : '—'} sub="opgesteld vermogen" />
                        <StatCard label="Wind 2024" value={windCap2024 ? `${Math.round(windCap2024)} MW` : '—'} sub={windCap2010 ? `+${Math.round((windCap2024 ?? 0) / windCap2010 * 100 - 100)}% groei` : ''} color="text-blue-600 dark:text-blue-400" />
                        <StatCard label="Zon 2024 (groot)" value={solarCap2024 > 0 ? `${Math.round(solarCap2024)} MW` : '—'} sub="dak + veld grote systemen" color="text-amber-500 dark:text-amber-400" />
                        <StatCard label="Hernieuwbaar aandeel" value={renShareLast !== null ? `${renShareLast}%` : '—'} sub={renShareFirst ? `was ${renShareFirst}% in 2010` : ''} color="text-emerald-600 dark:text-emerald-400" />
                    </>}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Opgesteld hernieuwbaar vermogen Zeeland (MW) — wind + zon</CardTitle>
                        <p className="text-sm text-muted-foreground">Indrukwekkende groei — maar op industriële schaal gemeten nog onvoldoende</p>
                    </CardHeader>
                    <CardContent>
                        {capacityConfig ? <EnergyChart config={capacityConfig} height={260} /> : <ChartSkeleton height={260} />}
                    </CardContent>
                </Card>

                {/* ── Stedin microdata ── */}
                <SectionDivider label="Stedin microdata — woningen & kleinbedrijf" />

                {stedinErr && (
                    <div className="border-l-4 border-red-400 bg-red-50 px-4 py-3 rounded-r-lg text-sm text-red-900 dark:bg-red-950 dark:text-red-200">
                        <strong>Stedin API error:</strong> {stedinErr}
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {!stedin ? [1,2,3,4].map(i => <Card key={i}><CardContent className="pt-4 pb-4"><Skeleton className="h-8 w-20 mt-1" /></CardContent></Card>) : <>
                        <StatCard label="Dataset" value={`${stedin.overview.year_range[0]}–${stedin.overview.year_range[1]}`} sub={`${stedin.overview.years_available.length} jaar · excl. 2022`} />
                        <StatCard label="ELK-aansluitingen" value={stedin.overview.total_elk_connections.toLocaleString('nl-NL')} sub="kleinverbruik 2025" color="text-blue-600 dark:text-blue-400" />
                        <StatCard label="Teruglevering 2013" value={`${stedin.solar_global.values[0]?.toFixed(1)}%`} sub="aansluitingen met zonnepanelen" />
                        <StatCard label="Teruglevering 2025" value={`${stedin.solar_global.values.at(-1)?.toFixed(1)}%`} sub="+1 op 3 Zeeuwse aansluitingen" color="text-emerald-600 dark:text-emerald-400" />
                    </>}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Elektriciteitsverbruik woningen & klein bedrijf (kWh/aansluiting)</CardTitle>
                            <p className="text-sm text-muted-foreground">Stedin kleinverbruik 2013–2025 · top 5 steden + provinciaal gem.</p>
                        </CardHeader>
                        <CardContent>
                            {elkConfig ? <EnergyChart config={elkConfig} height={280} /> : <ChartSkeleton height={280} />}
                            {stedin && (
                                <Insight color="blue">
                                    <strong>Residentieel daalt:</strong> Van {stedin.elk_trend.values[0]?.toFixed(0)} kWh (2013)
                                    naar {stedin.elk_trend.values.at(-1)?.toFixed(0)} kWh (2025) per woning — een daling van
                                    ~{Math.round((1 - (stedin.elk_trend.values.at(-1) ?? 0) / (stedin.elk_trend.values[0] ?? 1)) * 100)}%.
                                    Maar dit is kleinverbruik; grote industrie zit hier niet in.
                                </Insight>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Zonne-energie adoptie — teruglevering als proxy (%)</CardTitle>
                            <p className="text-sm text-muted-foreground">% aansluitingen dat netto terug levert aan het net · 2013–2025</p>
                        </CardHeader>
                        <CardContent>
                            {solarConfig ? <EnergyChart config={solarConfig} height={280} /> : <ChartSkeleton height={280} />}
                            <Insight color="emerald">
                                <strong>Burgers lopen voor:</strong> Meer dan 1 op 3 woningen levert terug.
                                Dit is de snelste transitie in de dataset — maar zelfs als élke woning panelen heeft,
                                is het residentieel vermogen een fractie van de industriële vraag.
                            </Insight>
                        </CardContent>
                    </Card>
                </div>

                {/* ── DV4 factors ── */}
                <SectionDivider label="Wat moet er veranderen?" />

                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                {
                                    n: 1, color: 'text-orange-600 dark:text-orange-400',
                                    title: 'Industriële elektrificatie',
                                    body: 'Processwarmte van aardgas omzetten naar elektrisch: warmtepompen, elektrische ovens, elektrische stoomgeneratoren. Dit is de grootste hefboom maar ook de duurste.',
                                },
                                {
                                    n: 2, color: 'text-blue-600 dark:text-blue-400',
                                    title: 'Groene waterstof',
                                    body: 'Zeeland heeft unieke ligging voor import en productie van groene H₂. Bedrijven als Dow en Yara zijn al actief met pilotprojecten. Schaal-up is cruciaal voor 2040.',
                                },
                                {
                                    n: 3, color: 'text-emerald-600 dark:text-emerald-400',
                                    title: 'Meer hernieuwbare capaciteit',
                                    body: 'Wind op zee (Borssele I-V) en uitbreiding zonne-energie leveren al meer op. Maar zonder industriële afname blijft de dekking onder 15% hangen.',
                                },
                                {
                                    n: 4, color: 'text-violet-600 dark:text-violet-400',
                                    title: 'Carbon capture (CCS)',
                                    body: 'Voor processen die moeilijk te elektrificeren zijn (hoge temperaturen, chemische reacties) is CCS een transitieoplossing. Zeeland heeft de infra via Porthos/Athos.',
                                },
                            ].map(({ n, title, body, color }) => (
                                <div key={n} className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">{n}</div>
                                    <div>
                                        <p className={`font-semibold text-sm mb-1 ${color}`}>{title}</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

            </div>
        </>
    );
}

Challenge2.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Challenge 2 — Zeeland Industrie', href: '/challenges/2' },
    ],
};
