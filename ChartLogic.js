const timeframeIntervals = {
    '1s': 1,
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
};

function ChartLogic({ timeframe, candles, chartContainerRef, isLoaded, setError }) {
    const { useEffect, useRef, useCallback } = React;

    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);
    const lastCandlesHashRef = useRef('');

    const validateCandle = (candle) => {
        return (
            candle &&
            typeof candle.time === 'number' &&
            typeof candle.open === 'number' &&
            typeof candle.high === 'number' &&
            typeof candle.low === 'number' &&
            typeof candle.close === 'number' &&
            !isNaN(candle.time) &&
            !isNaN(candle.open) &&
            !isNaN(candle.high) &&
            !isNaN(candle.low) &&
            !isNaN(candle.close)
        );
    };

    const aggregateCandles = () => {
        const candleData = Object.values(candles[timeframe] || {})
            .filter(candle => validateCandle(candle))
            .sort((a, b) => a.time - b.time)
            .map((c) => ({
                time: c.time,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
            }));
        return candleData;
    };

    const initializeChart = () => {
        if (!chartContainerRef.current) {
            setError('Chart container not available');
            return;
        }
        if (chartInstanceRef.current) {
            chartInstanceRef.current.remove();
            chartInstanceRef.current = null;
            chartRef.current = null;
        }

        try {
            const chart = window.LightweightCharts.createChart(chartContainerRef.current, {
                width: 1000,
                height: 600,
                layout: { background: { color: '#000000' }, textColor: '#ffffff' },
                grid: { vertLines: { color: '#222222' }, horzLines: { color: '#222222' } },
                timeScale: {
                    visible: true,
                    timeVisible: true,
                    secondsVisible: true,
                    barSpacing: 10,
                    minBarSpacing: 2,
                    rightOffset: 10,
                },
                priceScale: {
                    mode: 0,
                },
            });

            const candlestickSeries = chart.addCandlestickSeries({
                upColor: '#28a745',
                downColor: '#dc3545',
                borderVisible: false,
                wickUpColor: '#28a745',
                wickDownColor: '#dc3545',
                priceFormat: {
                    type: 'price',
                    precision: 6,
                    minMove: 0.000001,
                },
            });

            chartRef.current = candlestickSeries;
            chartInstanceRef.current = chart;

            chartContainerRef.current.style.borderRadius = '16px';
            chartContainerRef.current.style.overflow = 'hidden';
        } catch (err) {
            setError('Chart initialization failed');
        }
    };

    const updateChart = useCallback(() => {
        if (!chartRef.current || !chartInstanceRef.current || !isLoaded) {
            return;
        }
        try {
            const chartData = aggregateCandles();
            if (chartData.length === 0) {
                chartRef.current.setData([]);
                lastCandlesHashRef.current = '';
                return;
            }
            const candlesHash = JSON.stringify(
                chartData.map((c) => ({
                    time: c.time,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                }))
            );
            if (candlesHash === lastCandlesHashRef.current) {
                return;
            }
            chartRef.current.setData(chartData.slice(-10000));
            lastCandlesHashRef.current = candlesHash;
        } catch (err) {
            setError('Failed to update chart');
        }
    }, [timeframe, candles, isLoaded, setError]);

    useEffect(() => {
        initializeChart();
        return () => {
            if (chartInstanceRef.current) {
                try {
                    chartInstanceRef.current.remove();
                } catch (err) {
                    setError('Error cleaning up chart');
                }
                chartInstanceRef.current = null;
                chartRef.current = null;
            }
        };
    }, [setError]);

    useEffect(() => {
        updateChart();
    }, [candles, timeframe, updateChart]);

    return { validateCandle };
}

export default ChartLogic;