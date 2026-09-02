import { useState } from 'preact/hooks';
import { Icon } from './Icon';
import {
    DEFAULT_ATRBOT_ER_PARAMS,
    DEFAULT_ATRBOT_ER_STYLE,
    hexToRgba
} from '../utils/indicators';

export function ATRBotSettingsModal({ isOpen, onClose, config, onSave }) {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState('params'); // 'params' | 'style'
    const [params, setParams] = useState({ ...DEFAULT_ATRBOT_ER_PARAMS, ...(config?.params || {}) });
    const [style, setStyle] = useState({ ...DEFAULT_ATRBOT_ER_STYLE, ...(config?.style || {}) });

    const handleParamChange = (key, value) => {
        setParams(prev => ({ ...prev, [key]: value }));
    };

    const handleStyleChange = (key, value) => {
        setStyle(prev => ({ ...prev, [key]: value }));
    };

    const handleReset = () => {
        setParams({ ...DEFAULT_ATRBOT_ER_PARAMS });
        setStyle({ ...DEFAULT_ATRBOT_ER_STYLE });
    };

    const handleSave = () => {
        onSave({ params, style });
        onClose();
    };

    return (
        <>
            <div className="modal__backdrop" onClick={onClose} />
            <div className="modal atrbot-settings-modal" style={{ maxWidth: '480px', width: '92%' }}>
                {/* Header */}
                <div className="modal__header" style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon name="settings" size={20} />
                        <div>
                            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>ATRBot ER Settings</h2>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Adaptive Trail with Efficiency Ratio</span>
                        </div>
                    </div>
                    <button className="modal__close" onClick={onClose}>
                        <Icon name="close" size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '0 18px',
                    gap: '16px',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <button
                        type="button"
                        onClick={() => setActiveTab('params')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'params' ? '2px solid #2979FF' : '2px solid transparent',
                            color: activeTab === 'params' ? '#fff' : 'var(--text-secondary)',
                            fontWeight: activeTab === 'params' ? 600 : 400,
                            padding: '10px 4px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.2s'
                        }}
                    >
                        Parameters
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('style')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'style' ? '2px solid #2979FF' : '2px solid transparent',
                            color: activeTab === 'style' ? '#fff' : 'var(--text-secondary)',
                            fontWeight: activeTab === 'style' ? 600 : 400,
                            padding: '10px 4px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.2s'
                        }}
                    >
                        Draw Style
                    </button>
                </div>

                {/* Content */}
                <div className="modal__content" style={{ padding: '16px 18px', maxHeight: '60vh', overflowY: 'auto' }}>
                    {activeTab === 'params' ? (
                        <div className="atrbot-params-section">
                            {/* Group 1: Source & MA */}
                            <div style={{ marginBottom: '18px' }}>
                                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '10px' }}>
                                    Source & Moving Average
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Source</label>
                                        <select
                                            value={params.source}
                                            onChange={(e) => handleParamChange('source', e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '7px 10px',
                                                borderRadius: '6px',
                                                background: '#1A1A22',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: '#fff',
                                                fontSize: '12px'
                                            }}
                                        >
                                            <option value="close">Close</option>
                                            <option value="open">Open</option>
                                            <option value="high">High</option>
                                            <option value="low">Low</option>
                                            <option value="hl2">HL2 ((H+L)/2)</option>
                                            <option value="hlc3">HLC3 ((H+L+C)/3)</option>
                                            <option value="ohlc4">OHLC4</option>
                                        </select>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>MA Type</label>
                                        <select
                                            value={params.maType}
                                            onChange={(e) => handleParamChange('maType', e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '7px 10px',
                                                borderRadius: '6px',
                                                background: '#1A1A22',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: '#fff',
                                                fontSize: '12px'
                                            }}
                                        >
                                            <option value="EMA">EMA</option>
                                            <option value="VWMA">VWMA</option>
                                            <option value="VIDYA">VIDYA</option>
                                        </select>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>MA Length</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="500"
                                            value={params.maLen}
                                            onInput={(e) => handleParamChange('maLen', Math.max(1, parseInt(e.target.value) || 1))}
                                            style={{
                                                width: '100%',
                                                padding: '7px 10px',
                                                borderRadius: '6px',
                                                background: '#1A1A22',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: '#fff',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>

                                    {params.maType === 'VIDYA' && (
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>CMO Period</label>
                                            <input
                                                type="number"
                                                min="2"
                                                max="100"
                                                value={params.vidyaCmoLen}
                                                onInput={(e) => handleParamChange('vidyaCmoLen', Math.max(2, parseInt(e.target.value) || 2))}
                                                style={{
                                                    width: '100%',
                                                    padding: '7px 10px',
                                                    borderRadius: '6px',
                                                    background: '#1A1A22',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    color: '#fff',
                                                    fontSize: '12px'
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Group 2: ATR & Multipliers */}
                            <div style={{ marginBottom: '18px' }}>
                                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '10px' }}>
                                    ATR & Multiplier Range
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>ATR Length</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="200"
                                            value={params.atrLen}
                                            onInput={(e) => handleParamChange('atrLen', Math.max(1, parseInt(e.target.value) || 1))}
                                            style={{
                                                width: '100%',
                                                padding: '7px 10px',
                                                borderRadius: '6px',
                                                background: '#1A1A22',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: '#fff',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Base Multiplier</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0.1"
                                            max="10"
                                            value={params.multBase}
                                            onInput={(e) => handleParamChange('multBase', Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                                            style={{
                                                width: '100%',
                                                padding: '7px 10px',
                                                borderRadius: '6px',
                                                background: '#1A1A22',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: '#fff',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Mult Min (Trend)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0.1"
                                            max="10"
                                            value={params.multMin}
                                            onInput={(e) => handleParamChange('multMin', Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                                            style={{
                                                width: '100%',
                                                padding: '7px 10px',
                                                borderRadius: '6px',
                                                background: '#1A1A22',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: '#fff',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Mult Max (Noise)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0.1"
                                            max="20"
                                            value={params.multMax}
                                            onInput={(e) => handleParamChange('multMax', Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                                            style={{
                                                width: '100%',
                                                padding: '7px 10px',
                                                borderRadius: '6px',
                                                background: '#1A1A22',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: '#fff',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Group 3: Efficiency Ratio */}
                            <div>
                                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '10px' }}>
                                    Efficiency Ratio (Kaufman ER)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>ER Period</label>
                                        <input
                                            type="number"
                                            min="2"
                                            max="200"
                                            value={params.erLen}
                                            onInput={(e) => handleParamChange('erLen', Math.max(2, parseInt(e.target.value) || 2))}
                                            style={{
                                                width: '100%',
                                                padding: '7px 10px',
                                                borderRadius: '6px',
                                                background: '#1A1A22',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: '#fff',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>ER Smooth</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={params.erSmooth}
                                            onInput={(e) => handleParamChange('erSmooth', Math.max(1, parseInt(e.target.value) || 1))}
                                            style={{
                                                width: '100%',
                                                padding: '7px 10px',
                                                borderRadius: '6px',
                                                background: '#1A1A22',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: '#fff',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Curve Power</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="1.0"
                                            max="4.0"
                                            value={params.erPower}
                                            onInput={(e) => handleParamChange('erPower', Math.max(1.0, parseFloat(e.target.value) || 1.0))}
                                            style={{
                                                width: '100%',
                                                padding: '7px 10px',
                                                borderRadius: '6px',
                                                background: '#1A1A22',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: '#fff',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Slope Lookback</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={params.erSlopeLen}
                                            onInput={(e) => handleParamChange('erSlopeLen', Math.max(1, parseInt(e.target.value) || 1))}
                                            style={{
                                                width: '100%',
                                                padding: '7px 10px',
                                                borderRadius: '6px',
                                                background: '#1A1A22',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: '#fff',
                                                fontSize: '12px'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        id="erSlopeGuard"
                                        checked={params.erSlopeGuard}
                                        onChange={(e) => handleParamChange('erSlopeGuard', e.target.checked)}
                                        style={{ accentColor: '#2979FF', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="erSlopeGuard" style={{ fontSize: '12px', color: '#fff', cursor: 'pointer' }}>
                                        Enable ER Slope Guard (prevents exhaustion trap)
                                    </label>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="atrbot-style-section">
                            {/* Trail 1 Style */}
                            <div style={{
                                padding: '12px',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                marginBottom: '14px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            id="showTrail1"
                                            checked={style.showTrail1}
                                            onChange={(e) => handleStyleChange('showTrail1', e.target.checked)}
                                            style={{ accentColor: '#2979FF', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="showTrail1" style={{ fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                                            Trail 1 (Moving Average)
                                        </label>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <input
                                            type="color"
                                            value={style.trail1Color}
                                            onChange={(e) => handleStyleChange('trail1Color', e.target.value)}
                                            style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                                        />
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{style.trail1Color}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Line Width</span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        {[1, 2, 3, 4].map(w => (
                                            <button
                                                key={w}
                                                type="button"
                                                onClick={() => handleStyleChange('trail1Width', w)}
                                                style={{
                                                    width: '28px',
                                                    height: '24px',
                                                    borderRadius: '4px',
                                                    border: '1px solid',
                                                    borderColor: style.trail1Width === w ? '#2979FF' : 'rgba(255,255,255,0.1)',
                                                    background: style.trail1Width === w ? 'rgba(41, 121, 255, 0.2)' : 'transparent',
                                                    color: style.trail1Width === w ? '#2979FF' : 'var(--text-secondary)',
                                                    fontSize: '11px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {w}px
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Trail 2 Style */}
                            <div style={{
                                padding: '12px',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                marginBottom: '14px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            id="showTrail2"
                                            checked={style.showTrail2}
                                            onChange={(e) => handleStyleChange('showTrail2', e.target.checked)}
                                            style={{ accentColor: '#2979FF', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="showTrail2" style={{ fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                                            Trail 2 (ATR Trailing Stop)
                                        </label>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <input
                                            type="color"
                                            value={style.trail2Color}
                                            onChange={(e) => handleStyleChange('trail2Color', e.target.value)}
                                            style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                                        />
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{style.trail2Color}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Line Width</span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        {[1, 2, 3, 4].map(w => (
                                            <button
                                                key={w}
                                                type="button"
                                                onClick={() => handleStyleChange('trail2Width', w)}
                                                style={{
                                                    width: '28px',
                                                    height: '24px',
                                                    borderRadius: '4px',
                                                    border: '1px solid',
                                                    borderColor: style.trail2Width === w ? '#2979FF' : 'rgba(255,255,255,0.1)',
                                                    background: style.trail2Width === w ? 'rgba(41, 121, 255, 0.2)' : 'transparent',
                                                    color: style.trail2Width === w ? '#2979FF' : 'var(--text-secondary)',
                                                    fontSize: '11px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {w}px
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Cloud Fill Style */}
                            <div style={{
                                padding: '12px',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.06)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <input
                                        type="checkbox"
                                        id="showFill"
                                        checked={style.showFill}
                                        onChange={(e) => handleStyleChange('showFill', e.target.checked)}
                                        style={{ accentColor: '#2979FF', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="showFill" style={{ fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                                        Trend Cloud Fill
                                    </label>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Bull Cloud</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <input
                                                type="color"
                                                value={style.fillBullColor?.startsWith('#') ? style.fillBullColor : '#00ff88'}
                                                onChange={(e) => handleStyleChange('fillBullColor', hexToRgba(e.target.value, 0.12))}
                                                style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                                            />
                                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Bullish</span>
                                        </div>
                                    </div>

                                    <div>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Bear Cloud</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <input
                                                type="color"
                                                value={style.fillBearColor?.startsWith('#') ? style.fillBearColor : '#ff4444'}
                                                onChange={(e) => handleStyleChange('fillBearColor', hexToRgba(e.target.value, 0.12))}
                                                style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                                            />
                                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Bearish</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal__footer" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={handleReset}
                        style={{ fontSize: '12px', padding: '6px 12px', color: 'var(--text-tertiary)' }}
                    >
                        Reset Defaults
                    </button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={onClose}
                            style={{ fontSize: '12px', padding: '6px 14px' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn--primary"
                            onClick={handleSave}
                            style={{ fontSize: '12px', padding: '6px 16px', background: '#2979FF' }}
                        >
                            Save & Apply
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
