import { Head, Link } from '@inertiajs/react';
import { BarChart2, Building2, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard } from '@/routes';

const challenges = [
    {
        n: 1,
        href: '/challenges/1',
        Icon: BarChart2,
        title: 'The Dutch Energy Turning Point',
        level: 'Beginner–Intermediate',
        description:
            'Identify the turning point in the Dutch energy transition using 35 years of CBS data. Analyse the energy mix, transition momentum score, and GHG trajectory.',
        accent: 'border-t-emerald-500',
    },
    {
        n: 2,
        href: '/challenges/2',
        Icon: Building2,
        title: 'Sector Deep Dive',
        level: 'Intermediate',
        description:
            'Which sectors are driving the transition and which are lagging? Disaggregate national energy data by sector — electricity, industry, transport, and buildings.',
        accent: 'border-t-blue-500',
    },
    {
        n: 3,
        href: '/challenges/3',
        Icon: Target,
        title: '2030 Target Tracker',
        level: 'Advanced',
        description:
            'Is the Netherlands on track for its 2030 climate targets? Explore interactive scenarios and project the renewable share and GHG emissions to 2030.',
        accent: 'border-t-amber-500',
    },
];

export default function Dashboard() {
    return (
        <>
            <Head title="Datafest 2026 — Energy Dashboard" />

            <div className="flex flex-col gap-8 p-6">
                {/* Hero */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-2.5 py-0.5 text-xs font-medium">
                            Datafest 2026
                        </span>
                        <span>·</span>
                        <span>Energy &amp; Sustainability Track</span>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">Dutch Energy Transition Dashboard</h1>
                    <p className="text-muted-foreground max-w-2xl">
                        Explore 35 years of CBS energy and emissions data. Three challenges take you from
                        identifying the turning point, through sector analysis, to projecting whether the
                        Netherlands will meet its 2030 climate targets.
                    </p>
                </div>

                {/* Challenge cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {challenges.map(({ n, href, Icon, title, level, description, accent }) => (
                        <Link key={n} href={href} className="group block focus:outline-none">
                            <Card className={`h-full border-t-4 ${accent} transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring`}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-muted p-2">
                                                <Icon className="h-5 w-5 text-foreground" />
                                            </div>
                                            <span className="text-xs text-muted-foreground">{level}</span>
                                        </div>
                                        <span className="text-2xl font-bold text-muted-foreground/30">
                                            {n}
                                        </span>
                                    </div>
                                    <CardTitle className="text-base mt-3">{title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{description}</p>
                                    <p className="mt-4 text-sm font-medium text-foreground group-hover:underline">
                                        Open challenge →
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                {/* Dataset summary */}
                <Card>
                    <CardHeader>
                        <CardTitle>Dataset</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                            {[
                                { label: 'Time range', value: '1990–2024' },
                                { label: 'Data points', value: '35 years × 12 series' },
                                { label: 'Source', value: 'CBS Statline' },
                                { label: 'Tables', value: '1b · 5 · 6a' },
                            ].map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-muted-foreground">{label}</p>
                                    <p className="font-semibold text-foreground">{value}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Home', href: dashboard() }],
};
