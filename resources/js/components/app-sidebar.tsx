import { Link } from '@inertiajs/react';
import { BarChart2, BookOpen, Building2, FolderGit2, LayoutGrid, Target } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Challenge 1 — The Turning Point',
        href: '/challenges/1',
        icon: BarChart2,
    },
    {
        title: 'Challenge 2 — Sector Deep Dive',
        href: '/challenges/2',
        icon: Building2,
    },
    {
        title: 'Challenge 3 — 2030 Tracker',
        href: '/challenges/3',
        icon: Target,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/CaptainPancakeWithBacon/Datafest-2026',
        icon: FolderGit2,
    },
    {
        title: 'CBS Data Source',
        href: 'https://opendata.cbs.nl/statline/#/CBS/nl/dataset/83140NED',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
            </SidebarFooter>
        </Sidebar>
    );
}
