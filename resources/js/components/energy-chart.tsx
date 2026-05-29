import { useEffect, useRef } from 'react';
import { Chart, type ChartConfiguration } from 'chart.js/auto';

interface EnergyChartProps {
    config: ChartConfiguration;
    height?: number;
    className?: string;
}

export function EnergyChart({ config, height = 300, className }: EnergyChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        if (chartRef.current) {
            chartRef.current.destroy();
        }

        chartRef.current = new Chart(canvasRef.current, config);

        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, [config]);

    return (
        <div style={{ position: 'relative', height }} className={className}>
            <canvas ref={canvasRef} />
        </div>
    );
}
