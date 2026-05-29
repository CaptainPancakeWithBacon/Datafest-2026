const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8090';

async function get<T>(path: string): Promise<T> {
    const r = await fetch(`${API}${path}`);
    if (!r.ok) throw new Error(`API ${path} → ${r.status}`);
    return r.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
    const r = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`API ${path} → ${r.status}`);
    return r.json();
}

export const energyApi = {
    baseUrl: API,

    // ── Challenge 1 ───────────────────────────────────────────────────────────
    c1: {
        data:     ()           => get('/api/challenge-1/data'),
        timelapse: (year: number) => get(`/api/challenge-1/timelapse?year=${year}`),
        simulate: (params: { wind_growth: number; solar_growth: number; gas_reduction: number; horizon?: number }) =>
            post('/api/challenge-1/simulate', { horizon: 2030, ...params }),
    },

    // ── Challenge 2 ───────────────────────────────────────────────────────────
    c2: {
        status:           () => get('/api/challenge-2/status'),
        data:             () => get('/api/challenge-2/data'),
        totalConsumption: () => get('/api/challenge-2/total-consumption'),
        sectors:          () => get('/api/challenge-2/sectors'),
        fossilVsRenewable: () => get('/api/challenge-2/fossil-vs-renewable'),
        stedin:           () => get('/api/challenge-2/stedin/data'),
    },

    // ── Challenge 3 ───────────────────────────────────────────────────────────
    c3: {
        simulate: (params: { wind_growth: number; solar_growth: number; gas_reduction: number; horizon?: number }) =>
            post('/api/challenge-3/simulate', { horizon: 2030, ...params }),
        requiredPace: () => get('/api/challenge-3/required-pace'),
    },
};

// Keep the old flat simulate() for Challenge 3 backwards compat
export const simulate = energyApi.c3.simulate;
