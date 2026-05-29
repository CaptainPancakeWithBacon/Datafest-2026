import { Head } from '@inertiajs/react';
import { Database, GitMerge, LineChart, Map, Search, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Challenge2() {
    const steps = [
        {
            n: 1,
            level: 'Beginner',
            Icon: Search,
            title: 'Load and explore',
            description:
                'Get familiar with the dataset: what columns exist, what they mean, what is missing.',
            columns: [
                { name: 'ELK_SJV_KWH', desc: 'Annual electricity consumption (kWh)' },
                { name: 'GAS_SJV_M3', desc: 'Annual gas consumption (m³)' },
                { name: 'SLIMME_METER_PERC', desc: 'Smart meter penetration (%)' },
                { name: 'LEVERINGSRICHTING_PERC', desc: 'Net delivery direction — proxy for solar adoption' },
                { name: 'SOORT_AANSLUITING', desc: 'Connection type (residential / commercial / …)' },
            ],
            hint: 'Start with df.info(), df.describe(), and value_counts() on SOORT_AANSLUITING. Check for nulls in each numeric column.',
        },
        {
            n: 2,
            level: 'Beginner',
            Icon: LineChart,
            title: 'Plot trends over time',
            description:
                'How have electricity and gas consumption changed across Zeeland municipalities between 2013 and 2025? Is the decline in gas usage visible from around 2019 onwards? Is it uniform across the province, or faster in some areas?',
            columns: [],
            hint: 'Group by year and municipality, then plot median ELK_SJV_KWH and GAS_SJV_M3 per year. Facet by gemeente to compare rates of change.',
        },
        {
            n: 3,
            level: 'Beginner / Intermediate',
            Icon: Map,
            title: 'Map solar adoption',
            description:
                'When LEVERINGSRICHTING_PERC drops below 100%, a connection is net-feeding electricity back to the grid — a proxy for solar panel adoption. Join postcode coordinates and map this across Zeeland over time.',
            columns: [],
            hint: 'Use CBS PC6 coordinates to geolocate each postcode. Plot a choropleth for each year. Look for coast/inland or urban/rural spatial patterns.',
        },
        {
            n: 4,
            level: 'Intermediate',
            Icon: TrendingUp,
            title: 'Quantify the trend',
            description:
                'Fit a simple trend line per postal code to ELK_SJV_KWH over time. The slope gives you the annual consumption change. Which areas are improving fastest? Which have stalled or reversed?',
            columns: [],
            hint: 'Use scipy.stats.linregress or numpy.polyfit per postal code group. Store slope and R² for each postcode. Map the slope as a choropleth.',
        },
        {
            n: 5,
            level: 'Intermediate / Advanced',
            Icon: GitMerge,
            title: 'Extrapolate and ask policy questions',
            description:
                'Given current trends, when does each postal code reach 20% below 2013 consumption levels? Are any postal codes already net electricity producers? By 2030, what share of Zeeland postal codes could reach that milestone?',
            columns: [],
            hint: 'Extrapolate each trend line to 2030. Flag postal codes where LEVERINGSRICHTING_PERC < 50% already (net producers). Compute the 2030 projection and visualise as a map.',
        },
    ];

    const dataSources = [
        {
            name: 'Stedin — Verbruiksgegevens Open Data',
            desc: 'Electricity and gas connections per postcode, Zeeland, 2013–2025. Includes ELK_SJV_KWH, GAS_SJV_M3, LEVERINGSRICHTING_PERC, SLIMME_METER_PERC.',
            tag: 'Primary',
            tagClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
        },
        {
            name: 'CBS — Kerncijfers per postcode (PC6)',
            desc: 'Demographic and geographic data per 6-digit postcode. Use for coordinate lookup and socioeconomic context.',
            tag: 'Join',
            tagClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        },
        {
            name: 'Energy Transition Model — Data Manager',
            desc: 'Information on housing types, energy profiles, and regional transition scenarios. Useful for Step 5 context.',
            tag: 'Context',
            tagClass: 'bg-muted text-muted-foreground',
        },
    ];

    const advancedQuestions = [
        'To what extent can Zeeland become energy self-sufficient by 2050, and what energy mix would that require?',
        'How much generation and storage capacity would be needed to make a single Zeeuwse municipality energy-neutral?',
        'If the population of Zeeland grows by 150,000 people, can the province still meet its climate targets?',
    ];

    return (
        <>
            <Head title="Challenge 2 — Zeeland" />

            <div className="flex flex-col gap-6 p-4">
                {/* Header */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="mb-3 flex flex-wrap gap-2">
                            <Badge variant="secondary">Challenge 2 · Beginner–Intermediate</Badge>
                            <Badge variant="outline">3 datasets</Badge>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">
                            Zeeland — From Province to Postcode
                        </h1>
                        <p className="text-muted-foreground mb-4">
                            Zeeland has its own energy story. Can we read that story from the grid data and use
                            it to say something useful about the future?
                        </p>
                        <p className="text-sm text-muted-foreground">
                            This challenge uses detailed microdata from Stedin covering electricity and gas
                            connections across Zeeland from 2013 to 2025, broken down by postal code. Steps 1–3
                            are accessible to anyone with basic Python and pandas skills. Steps 4–5 are stretch
                            goals for teams that move quickly.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-full px-3 py-1 text-xs bg-muted text-muted-foreground">
                                Steps 1–3: Accessible
                            </span>
                            <span className="rounded-full px-3 py-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                Steps 4–5: Stretch goals
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Steps */}
                <div className="flex flex-col gap-4">
                    {steps.map(({ n, level, Icon, title, description, columns, hint }) => (
                        <Card key={n}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background text-sm font-semibold flex-shrink-0">
                                        {n}
                                    </div>
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-base">{title}</CardTitle>
                                    <span className="ml-auto text-xs text-muted-foreground">{level}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-sm text-muted-foreground">{description}</p>

                                {columns.length > 0 && (
                                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                                        <p className="text-xs font-medium text-foreground mb-2">Key columns</p>
                                        <div className="space-y-1">
                                            {columns.map(({ name, desc }) => (
                                                <div key={name} className="flex gap-2 text-xs">
                                                    <code className="font-mono text-foreground shrink-0">{name}</code>
                                                    <span className="text-muted-foreground">— {desc}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="border-l-4 border-blue-400 bg-blue-50 px-4 py-2 rounded-r-lg text-xs text-blue-900 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-600">
                                    <strong>Hint:</strong> {hint}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Data sources */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <CardTitle>Data sources</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {dataSources.map(({ name, desc, tag, tagClass }) => (
                            <div key={name} className="flex items-start gap-3">
                                <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tagClass}`}>
                                    {tag}
                                </span>
                                <div>
                                    <p className="text-sm font-medium text-foreground">{name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Advanced questions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Advanced sub-questions</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            For teams that finish the five steps early — these open-ended questions have no single correct answer.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {advancedQuestions.map((q, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium text-muted-foreground">
                                        {i + 1}
                                    </div>
                                    <p className="text-sm text-foreground">{q}</p>
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
        { title: 'Challenge 2 — Zeeland', href: '/challenges/2' },
    ],
};
