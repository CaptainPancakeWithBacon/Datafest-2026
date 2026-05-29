const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8090';

export const energyApi = {
    baseUrl: API_URL,

    async all() {
        const r = await fetch(`${API_URL}/api/data/all`);
        return r.json();
    },

    async timelapse(year: number) {
        const r = await fetch(`${API_URL}/api/timelapse?year=${year}`);
        return r.json();
    },

    async simulate(params: {
        wind_growth: number;
        solar_growth: number;
        gas_reduction: number;
        horizon?: number;
    }) {
        const r = await fetch(`${API_URL}/api/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ horizon: 2030, ...params }),
        });
        return r.json();
    },
};
