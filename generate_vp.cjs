const fs = require('fs');

const atrBotPath = '/Users/baotm/Desktop/td-pwa/chart/custom_studies/atr-bot.js';
const atrBotCode = fs.readFileSync(atrBotPath, 'utf8');

const vpMethods = `
            this.addToProfile = function (profile, data, rowSize) {
                if (!data || !data.volume || data.volume <= 0) return;
                if (isNaN(data.high) || isNaN(data.low)) return;

                const tickSize = rowSize;

                const minPrice = Math.floor(data.low / tickSize) * tickSize;
                const maxPrice = Math.floor(data.high / tickSize) * tickSize;

                if (minPrice === maxPrice) {
                    const key = this.priceKey(minPrice);
                    profile[key] = (profile[key] || 0) + data.volume;
                } else {
                    const steps = Math.round((maxPrice - minPrice) / tickSize) + 1;
                    const volPerStep = data.volume / steps;

                    for (let p = minPrice; p <= maxPrice + tickSize * 0.1; p += tickSize) {
                        const key = this.priceKey(p);
                        profile[key] = (profile[key] || 0) + volPerStep;
                    }
                }
            };

            this.priceKey = function (price) {
                return Math.round(price * 10000000000) / 10000000000;
            };

            this.calculateStats = function (profile, vaPct) {
                const keys = Object.keys(profile);
                if (keys.length === 0) {
                    return { poc: NaN, vah: NaN };
                }

                const levels = [];
                let maxVol = 0;
                let pocPrice = NaN;
                let totalVol = 0;

                for (const key of keys) {
                    const price = parseFloat(key);
                    const vol = profile[key];

                    totalVol += vol;
                    levels.push({ price, vol });

                    if (vol > maxVol) {
                        maxVol = vol;
                        pocPrice = price;
                    }
                }

                if (levels.length === 0 || totalVol === 0) {
                    return { poc: NaN, vah: NaN };
                }

                levels.sort((a, b) => a.price - b.price);

                let pocIndex = -1;
                for (let i = 0; i < levels.length; i++) {
                    if (Math.abs(levels[i].price - pocPrice) < 0.00000001) {
                        pocIndex = i;
                        break;
                    }
                }
                if (pocIndex === -1) pocIndex = 0;

                const targetVol = totalVol * (vaPct / 100);
                let currentVol = levels[pocIndex].vol;
                let upIdx = pocIndex;
                let downIdx = pocIndex;

                while (currentVol < targetVol && (upIdx < levels.length - 1 || downIdx > 0)) {
                    const upVol = (upIdx < levels.length - 1) ? levels[upIdx + 1].vol : 0;
                    const downVol = (downIdx > 0) ? levels[downIdx - 1].vol : 0;

                    if (upVol === 0 && downVol === 0) break;

                    if (upVol >= downVol && upIdx < levels.length - 1) {
                        upIdx++;
                        currentVol += upVol;
                    } else if (downIdx > 0) {
                        downIdx--;
                        currentVol += downVol;
                    } else {
                        break;
                    }
                }

                return {
                    poc: pocPrice,
                    vah: levels[upIdx].price
                };
            };
`;

let newCode = atrBotCode.replace('function createATRBot(PineJS) {', 'function createATRBotVP(PineJS) {');
newCode = newCode.replace('name: "ATR Bot",', 'name: "ATR Bot VP",');
newCode = newCode.replace('id: "atrbot@tv-basicstudies-1",', 'id: "atrbot_vp@tv-basicstudies-1",');
newCode = newCode.replace('name: "ATR Bot",', 'name: "ATR Bot VP",');
newCode = newCode.replace('shortDescription: "ATR Bot",', 'shortDescription: "ATR Bot VP",');

let plotIndex = newCode.indexOf('plots: [');
let plotEndIndex = newCode.indexOf(']', plotIndex);
let plotsSection = newCode.substring(plotIndex, plotEndIndex + 1);

let newPlotsSection = plotsSection.replace(']', '    { id: "plot_poc", type: "line" },\n                { id: "plot_vah", type: "line" }\n            ]');
newCode = newCode.replace(plotsSection, newPlotsSection);

let stylesIndex = newCode.indexOf('styles: {', newCode.indexOf('defaults:'));
let stylesEndIndex = newCode.indexOf('},', newCode.indexOf('plot_3', stylesIndex));
// append poc/vah styles to defaults.styles
let newCodeParts = newCode.split('filledAreasStyle:');
let defaultsStyles = newCodeParts[0] + `                    plot_poc: {
                        linestyle: 0,
                        linewidth: 2,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 0,
                        visible: true,
                        color: "#FFD700" // Gold for POC
                    },
                    plot_vah: {
                        linestyle: 1, // Dashed
                        linewidth: 1,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 0,
                        visible: true,
                        color: "#00E676" // Green for VAH
                    }\n                },\n                ` + 'filledAreasStyle:' + newCodeParts[1];

newCode = defaultsStyles;

let inputsIndex = newCode.indexOf('inputs: {\n', newCode.indexOf('defaults:'));
newCode = newCode.replace('ma_length: 30\n                }', 'ma_length: 30,\n                    vp_rowSize: 0.0001,\n                    vp_valueAreaVolume: 70\n                }');

let inputsArrIndex = newCode.indexOf('inputs: [');
// append inputs
newCode = newCode.replace('            ],\n\n            styles', '                {\n                    id: "vp_rowSize",\n                    name: "VP Row Size",\n                    defval: 0.0001,\n                    type: "float",\n                    min: 0.00001,\n                    max: 1000,\n                    step: 0.0001\n                },\n                {\n                    id: "vp_valueAreaVolume",\n                    name: "VP Value Area Volume (%)",\n                    defval: 70,\n                    type: "integer",\n                    min: 10,\n                    max: 100\n                }\n            ],\n\n            styles');

// meta styles
newCode = newCode.replace('            filledAreas:', '                plot_poc: {\n                    title: "POC",\n                    histogramBase: 0,\n                    joinPoints: false\n                },\n                plot_vah: {\n                    title: "VAH",\n                    histogramBase: 0,\n                    joinPoints: false\n                }\n            },\n\n            filledAreas:');

// init
const initVars = `
                // Variables for SWMA calculation
                this.swma_buffer = [];

                // VP variables
                this.committed_profile = {};
                this.is_uptrend = null;
                this.last_committed_index = -1;
                this.pending_bar_data = null;
                this.pending_bar_index = -1;
`;
newCode = newCode.replace('this.swma_buffer = [];', initVars.trim());


// main
const mainInputs = `
                const vp_rowSize = this._input(5);
                const vp_vaPct = this._input(6);

                const index = PineJS.Std.n(this._context);
`;
newCode = newCode.replace('const ma_length = this._input(4);', 'const ma_length = this._input(4);\n' + mainInputs);


const returnsReplace = `
                // Determine which fill to show based on trail1 vs trail2
                let trail1_green = NaN;  
                let trail1_red = NaN;    

                let current_trend = trail1 > trail2 ? true : false;
                
                if (this.is_uptrend === null) {
                    this.is_uptrend = current_trend;
                } else if (this.is_uptrend !== current_trend) {
                    // Trend changed, reset profile
                    this.committed_profile = {};
                    this.pending_bar_data = null;
                    this.last_committed_index = index - 1;
                    this.is_uptrend = current_trend;
                }

                if (index > this.last_committed_index) {
                    if (this.pending_bar_data && this.pending_bar_index === index - 1) {
                        this.addToProfile(this.committed_profile, this.pending_bar_data, vp_rowSize);
                    }
                    this.last_committed_index = index;
                }

                if (trail1 > trail2) {
                    trail1_green = trail1;  
                    trail1_red = NaN;       
                } else {
                    trail1_green = NaN;     
                    trail1_red = trail1;    
                }

                if (isNaN(high) || isNaN(low) || isNaN(volume)) {
                    return [trail1, trail2, trail1_green, trail1_red, NaN, NaN];
                }

                const current_bar_data = { high, low, volume };
                this.pending_bar_data = current_bar_data;
                this.pending_bar_index = index;

                const display_profile = Object.assign({}, this.committed_profile);
                this.addToProfile(display_profile, current_bar_data, vp_rowSize);

                let poc = NaN, vah = NaN;
                if (Object.keys(display_profile).length > 0) {
                    const stats = this.calculateStats(display_profile, vp_vaPct);
                    poc = stats.poc;
                    vah = stats.vah;
                }

                return [trail1, trail2, trail1_green, trail1_red, poc, vah];
`;

newCode = newCode.replace(/\/\/\s*Determine which fill to show based on trail1 vs trail2[\s\S]*return\s*\[trail1,\s*trail2,\s*trail1_green,\s*trail1_red\];\s*\};\s*\}\s*\};\s*\}/, returnsReplace.trim() + '\n            };\n' + vpMethods.trim() + '\n        }\n    };\n}');

fs.writeFileSync('/Users/baotm/Desktop/td-pwa/chart/custom_studies/atr-bot-vp.js', newCode);
console.log("GENERATED");
