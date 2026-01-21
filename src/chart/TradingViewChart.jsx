import { useEffect, useRef } from 'preact/hooks';

/**
 * TradingView Advanced Chart Wrapper Component
 * Integrates with the TradingView Charting Library
 */
export function TradingViewChart({
    symbol = 'BTCUSDT',
    interval = '5',
    theme = 'dark',
    onChartReady,
    containerId = 'tv_chart_container'
}) {
    const containerRef = useRef(null);
    const widgetRef = useRef(null);

    useEffect(() => {
        const initWidget = async () => {
            if (!containerRef.current) return;

            // Check if TradingView library is loaded
            if (typeof window.TradingView === 'undefined') {
                console.warn('TradingView library not found. Make sure charting_library is loaded.');
                return;
            }

            // Clean up previous widget
            if (widgetRef.current) {
                widgetRef.current.remove();
                widgetRef.current = null;
            }

            const widgetOptions = {
                debug: false,
                symbol: `BINANCE:${symbol}`,
                datafeed: new window.Datafeeds.UDFCompatibleDatafeed('https://demo-feed-data.tradingview.com'),
                interval: interval,
                container: containerRef.current,
                library_path: '/chart/charting_library/',
                locale: 'en',

                // Disable features for mobile-like experience
                disabled_features: [
                    // 'header_symbol_search',
                    // 'header_compare',
                    // 'header_undo_redo',
                    // 'header_screenshot',
                    // 'header_fullscreen_button',
                    // 'header_settings',
                    // 'compare_symbol',
                    // 'left_toolbar',
                    // 'context_menus',
                    // 'control_bar',
                    // 'timeframes_toolbar',
                    // 'edit_buttons_in_legend',
                    // 'border_around_the_chart',
                    // 'remove_library_container_border',
                    // 'go_to_date',
                    // 'use_localstorage_for_settings',
                    // 'save_chart_properties_to_local_storage',

                    'timeframes_toolbar',
                    'show_object_tree',
                    'popup_hints',
                    'bottom_toolbar',
                    'control_bar',
                    'open_account_manager',
                    'trading_account_manager',
                    'trading_notifications',
                    'header_screenshot'
                ],

                enabled_features: [
                    'hide_left_toolbar_by_default',
                    'move_logo_to_main_pane',
                ],

                fullscreen: false,
                autosize: true,

                theme: theme === 'dark' ? 'dark' : 'light',
                timezone: 'Etc/UTC',

                // Dark theme overrides
                custom_css_url: '',
                toolbar_bg: '#111114',
                loading_screen: {
                    backgroundColor: '#0B0B0E',
                    foregroundColor: '#2979FF'
                },

                overrides: {
                    // Pane background
                    'paneProperties.background': '#0B0B0E',
                    'paneProperties.backgroundType': 'solid',

                    // Grid
                    'paneProperties.vertGridProperties.color': '#1A1A1F',
                    'paneProperties.horzGridProperties.color': '#1A1A1F',

                    // Scales
                    'scalesProperties.textColor': '#A0A0A8',
                    'scalesProperties.lineColor': '#2A2A30',
                    'scalesProperties.backgroundColor': '#0B0B0E',

                    // Candles
                    'mainSeriesProperties.candleStyle.upColor': '#00C853',
                    'mainSeriesProperties.candleStyle.downColor': '#FF3B30',
                    'mainSeriesProperties.candleStyle.drawWick': true,
                    'mainSeriesProperties.candleStyle.drawBorder': true,
                    'mainSeriesProperties.candleStyle.borderUpColor': '#00C853',
                    'mainSeriesProperties.candleStyle.borderDownColor': '#FF3B30',
                    'mainSeriesProperties.candleStyle.wickUpColor': '#00C853',
                    'mainSeriesProperties.candleStyle.wickDownColor': '#FF3B30',

                    // Volume
                    'volumePaneSize': 'medium',
                },

                studies_overrides: {
                    'volume.volume.color.0': '#FF3B30',
                    'volume.volume.color.1': '#00C853',
                },
            };

            try {
                widgetRef.current = new window.TradingView.widget(widgetOptions);

                widgetRef.current.onChartReady(() => {
                    console.log('TradingView chart is ready');
                    if (onChartReady) {
                        onChartReady(widgetRef.current);
                    }
                });
            } catch (error) {
                console.error('Failed to create TradingView widget:', error);
            }
        };

        // Small delay to ensure DOM is ready
        const timeoutId = setTimeout(initWidget, 100);

        return () => {
            clearTimeout(timeoutId);
            if (widgetRef.current) {
                widgetRef.current.remove();
                widgetRef.current = null;
            }
        };
    }, [symbol, interval, theme]);

    // Method to change symbol
    const setSymbol = (newSymbol) => {
        if (widgetRef.current) {
            widgetRef.current.onChartReady(() => {
                widgetRef.current.chart().setSymbol(`BINANCE:${newSymbol}`);
            });
        }
    };

    // Method to change resolution/interval
    const setResolution = (newResolution) => {
        if (widgetRef.current) {
            widgetRef.current.onChartReady(() => {
                widgetRef.current.chart().setResolution(newResolution);
            });
        }
    };

    return (
        <div
            id={containerId}
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
            }}
        />
    );
}

export default TradingViewChart;
