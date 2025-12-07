/**
 * Vena-AI Main Controller
 * Orchestrates Storage, Logic, UI, and AI modules.
 * Refactored to match Logic from v7.2
 */

const App = {
    state: {
        currentUser: 'Anthony',
        currentLift: 'squat', // 'squat' or 'bench'
        currentMode: 'heavy', // 'heavy' or 'vol'
        pivotActive: false,
        currentDate: new Date().toISOString().split('T')[0]
    },

    async init() {
        console.log("Vena-AI (v8/v7.2-Hybrid) initializing...");
        
        // Initialize AI
        if (typeof AIModel !== 'undefined') await AIModel.init();
        
        // Init UI Binding
        UI.init();
        
        // Load Defaults
        const config = Storage.getConfig();
        if (config.currentUser) this.state.currentUser = config.currentUser;
        
        // Initial Render
        this.applyTheme();
        this.refreshView();
        
        // FIX: Update "Initializing..." text to current date/day
        const d = new Date();
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        document.getElementById('dayDisplay').textContent = `${days[d.getDay()]} Session`;

        // Train model
        this.trainModel();
    },

    // ==========================================
    // State Management
    // ==========================================
    
    switchUser(user) {
        this.state.currentUser = user;
        Storage.updateConfig('currentUser', user);
        
        // Update UI buttons
        UI.elements.btnUserAnthony.className = user === 'Anthony' ? 'user-btn active-anthony' : 'user-btn';
        UI.elements.btnUserSeth.className = user === 'Seth' ? 'user-btn active-seth' : 'user-btn';
        document.getElementById('loggerName').textContent = user;
        
        this.refreshView();
        this.trainModel();
    },

    switchLift(lift) {
        this.state.currentLift = lift;
        this.applyTheme();
        this.refreshView();
    },

    applyTheme() {
        const isSquat = this.state.currentLift === 'squat';
        document.body.className = isSquat ? 'squat-theme' : 'bench-theme';
        document.getElementById('appTitle').textContent = isSquat ? "SQUAT PLANNER" : "BENCH PLANNER";
        
        UI.elements.btnSelectSquat.className = isSquat ? 'lift-btn active-squat' : 'lift-btn';
        UI.elements.btnSelectBench.className = !isSquat ? 'lift-btn active-bench' : 'lift-btn';
    },

    setMode(mode) {
        this.state.currentMode = mode;
        
        if (mode === 'heavy') {
            UI.elements.btnHeavy.className = 'mode-btn active';
            UI.elements.btnVol.className = 'mode-btn';
            UI.elements.sectionHeavy.style.display = 'block';
            UI.elements.sectionVol.style.display = 'none';
            
            // Auto-fill previous volume
            const history = this.getFilteredHistory();
            if (history.length > 0) {
                const last = history[history.length - 1];
                UI.elements.prevVol.value = last.volActual || (this.state.currentLift === 'squat' ? 365 : 225);
            } else {
                UI.elements.prevVol.value = (this.state.currentLift === 'squat' ? 365 : 225);
            }
            
            this.updateSuggestionDisplay();
            this.liveUpdateHeavy();

        } else {
            UI.elements.btnHeavy.className = 'mode-btn';
            UI.elements.btnVol.className = 'mode-btn active';
            UI.elements.sectionHeavy.style.display = 'none';
            UI.elements.sectionVol.style.display = 'block';
            
            // Calculate Volume Target
            const res = this.calculateWaveTarget(this.getFilteredHistory(), this.state.pivotActive);
            document.getElementById('volContextText').textContent = res.note;
            UI.elements.volActual.value = res.weight;
            
            const instr = this.state.pivotActive ? 
                "Pivot Active: Technical work only. Don't push volume." : 
                `Goal: Complete 3 sets of ${res.reps} reps.`;
            document.getElementById('volInstruction').textContent = instr;
            
            // Visuals
            this.updateWaveVisuals(res.reps);
            
            document.getElementById('volTargetOut').textContent = res.weight + " lb";
            const tag = this.state.pivotActive ? "3x3 Tech" : `3x${res.reps}`;
            document.getElementById('volNote').textContent = `Target: ${tag}`;
            
            UI.elements.volPlateLoadingBox.textContent = "Load: " + UI.getPlateLoading(res.weight);
            UI.elements.volPlateLoadingBox.style.display = 'block';
            
            this.previewVolWarmup();
        }
    },

    togglePivot() {
        this.state.pivotActive = UI.elements.pivotMode.checked;
        
        const lbl = document.getElementById('lblHeavySingle');
        const note = document.getElementById('backdownNote');

        if (this.state.pivotActive) {
            lbl.textContent = `2. Today's Pivot Single (${this.state.currentLift === 'squat' ? 'Pause Squat' : 'Tempo Bench'})`;
            note.textContent = "@ 75% (Pivot Adjustment)";
        } else {
            lbl.textContent = "2. Today's Skill Single (Comp Lift)";
            note.textContent = "@ 82% of Single";
        }

        this.updateSuggestionDisplay();
        this.liveUpdateHeavy();
        
        // Refresh mode content if active
        if (this.state.currentMode === 'vol') this.setMode('vol');
    },

    refreshView() {
        // Reset states
        this.state.pivotActive = false;
        UI.elements.pivotMode.checked = false;
        UI.elements.protocolBanner.style.display = 'none';
        
        // Check System Status (Autopilot from v7.2)
        this.runSystemAutopilot();
        
        // Render History
        this.renderHistory();
        
        // Set Mode (Default based on day? Or just keep heavy)
        this.setMode(this.state.currentMode);
        
        // AI Prediction
        this.updatePrediction();
    },

    // ==========================================
    // Logic & Calculations (Ported from v7.2)
    // ==========================================

    getFilteredHistory() {
        const allHistory = Storage.getHistory(this.state.currentUser);
        // v7.2 separated keys. Here we filter by 'type' property in the JSON.
        // We assume 'type' contains 'squat' or 'bench'.
        return allHistory.filter(h => 
            (h.type && h.type.includes(this.state.currentLift)) || 
            // Fallback for v7.2 raw data import which might not have 'type' field but structure implies it if we imported per user/lift
            // Actually, if we use the v8 storage structure, we need to ensure 'type' is set correctly on save.
            true 
        ).filter(h => {
             // If we want strict separation, we need to rely on the 'type' field saved.
             // If legacy data, we might need a migration. For now assume saved data has type.
             return h.type ? h.type.includes(this.state.currentLift) : true;
        });
    },

    runSystemAutopilot() {
        const h = this.getFilteredHistory();
        const recent = h.slice(-5);
        let badCount = 0; let failCount = 0;

        recent.forEach(e => {
            if (e.heavyQuality === 'bad' || e.overshoot === 'yes' || e.backdownFail === 'yes') badCount++;
            if (e.volFail === 'yes') failCount++;
        });

        const statusBox = UI.elements.systemStatus;
        const banner = UI.elements.protocolBanner;
        const pivotSwitch = UI.elements.pivotMode;

        if (badCount >= 2 || failCount >= 2) {
            // RED
            pivotSwitch.checked = true;
            pivotSwitch.disabled = true;
            this.state.pivotActive = true;
            statusBox.style.display = 'none';
            banner.style.display = 'block';
            this.togglePivot(); // Apply UI changes
        } else if (badCount > 0 || failCount > 0) {
            // YELLOW
            pivotSwitch.disabled = false;
            banner.style.display = 'none';
            statusBox.style.display = 'block';
            statusBox.className = 'status-box status-yellow';
            statusBox.textContent = "SYSTEM CAUTION: RECENT OVERSHOOT DETECTED";
        } else {
            // GREEN
            pivotSwitch.disabled = false;
            banner.style.display = 'none';
            statusBox.style.display = 'block';
            statusBox.className = 'status-box status-green';
            statusBox.textContent = "SYSTEM NOMINAL: READY TO TRAIN";
        }
    },

    generateHeavySuggestion(history, isPivot) {
        if (!history || history.length === 0) return null;
        const last = history[history.length - 1];
        
        // If last entry didn't have heavySingle, look back one more? 
        // v7.2 assumes strictly chronological.
        if (!last.heavySingle) return null;

        let baseTarget = last.heavySingle;
        let baseReason = "";

        if (last.backdownFail === 'yes') {
            baseTarget = this.roundTo5(last.heavySingle * 0.90);
            baseReason = "Backdown Fail.";
        } else if (last.overshoot === 'yes' || (last.heavyRpe && last.heavyRpe >= 9.5)) {
            baseTarget = this.roundTo5(last.heavySingle * 0.92);
            baseReason = `Overshoot Correction.`;
        } else if (last.heavyRpe && last.heavyRpe >= 9) {
            baseTarget = last.heavySingle;
            baseReason = "Hold RPE 8.";
        } else if (last.heavyQuality === 'good' && last.heavyRpe <= 8) {
            baseTarget = last.heavySingle + 5;
            baseReason = "Clean RPE 8.";
        } else {
            baseReason = "Maintenance.";
        }

        if (isPivot) {
            const pivotTarget = this.roundTo5(baseTarget * 0.85);
            return { target: pivotTarget, text: `${baseReason} Base ${baseTarget}. Pivot (-15%): Try ${pivotTarget}` };
        }

        return { target: baseTarget, text: `${baseReason} Try ${baseTarget}` };
    },

    calculateWaveTarget(history, pivot) {
        let lastRealVol = null;
        // Find last volume session
        for(let i=history.length-1; i>=0; i--) {
            if(history[i].volActual && !history[i].pivot) { lastRealVol = history[i]; break; }
        }

        if (pivot) {
            let refWeight = lastRealVol ? lastRealVol.volActual : (this.state.currentLift==='squat'?365:225);
            let targetWeight = this.roundTo5(refWeight * 0.85);
            return { weight: targetWeight, reps: 3, note: "Pivot: Light Technical Work", isPause: true };
        }

        let targetWeight = (this.state.currentLift === 'squat') ? 365 : 225;
        let targetReps = 4;
        let note = "Wave Start";

        if (lastRealVol) {
            const success = (lastRealVol.volFail === 'no');
            const prevReps = lastRealVol.volReps || 4;
            const prevWeight = lastRealVol.volActual;

            if (success) {
                if (prevReps === 4) {
                    targetWeight = prevWeight;
                    targetReps = 5;
                    note = "Step Up: Add Volume (3x5)";
                } else if (prevReps === 5) {
                    targetWeight = prevWeight;
                    targetReps = 6;
                    note = "Step Up: Peak Volume (3x6)";
                } else if (prevReps >= 6) {
                    targetWeight = prevWeight + 5;
                    targetReps = 4;
                    note = "Wave Complete! +5lbs, Reset to 3x4";
                }
            } else {
                targetWeight = prevWeight;
                targetReps = prevReps;
                note = "Missed Reps. Retry same weight/reps.";
            }
        }

        return { weight: targetWeight, reps: targetReps, note, isPause: false };
    },

    roundTo5(x) { return Math.round(x / 5) * 5; },

    // ==========================================
    // Interactions
    // ==========================================

    liveUpdateHeavy() {
        const heavySingle = parseFloat(UI.elements.heavySingle.value || 0);
        const percentage = this.state.pivotActive ? 0.75 : 0.82;
        const bd = this.roundTo5(heavySingle * percentage);

        document.getElementById('backdownOut').textContent = (bd > 0) ? bd + " lb" : "–";
        
        if (bd > 0) {
            UI.elements.plateLoadingBox.textContent = "Load: " + UI.getPlateLoading(bd);
            UI.elements.plateLoadingBox.style.display = 'block';
            
            UI.elements.warmupPreviewHeavy.textContent = "Warmup: " + UI.generateWarmup(heavySingle, this.state.currentLift);
            UI.elements.warmupPreviewHeavy.style.display = 'block';
        } else {
            UI.elements.plateLoadingBox.style.display = 'none';
            UI.elements.warmupPreviewHeavy.style.display = 'none';
        }

        // Update Next Wave Target Preview
        const nextVol = this.calculateWaveTarget(this.getFilteredHistory(), this.state.pivotActive);
        const tag = nextVol.isPause ? "3x3 Technical" : `3x${nextVol.reps}`;
        
        document.getElementById('lblVolTarget').textContent = `Next Wave Target (${tag})`;
        document.getElementById('volTargetOut').textContent = nextVol.weight + " lb";
        document.getElementById('volNote').textContent = nextVol.note;
        UI.elements.volPlateLoadingBox.textContent = "Load: " + UI.getPlateLoading(nextVol.weight);
        UI.elements.volPlateLoadingBox.style.display = 'block';
    },

    previewVolWarmup() {
        const val = parseFloat(UI.elements.volActual.value);
        if(!val) return;
        const wBox = UI.elements.warmupPreviewVol;
        wBox.textContent = "Warmup: " + UI.generateWarmup(val, this.state.currentLift);
        wBox.style.display = 'block';
    },

    updateSuggestionDisplay() {
        const h = this.getFilteredHistory();
        const box = UI.elements.heavySuggestionBox;
        
        if (!h || h.length === 0) {
            box.style.display = 'none';
            return;
        }

        const sugg = this.generateHeavySuggestion(h, this.state.pivotActive);
        if (sugg) {
            box.style.display = 'block';
            box.textContent = "💡 " + sugg.text;
        } else {
            box.style.display = 'none';
        }
    },

    updateWaveVisuals(reps) {
        document.getElementById('step1').className = 'wave-step';
        document.getElementById('step2').className = 'wave-step';
        document.getElementById('step3').className = 'wave-step';

        if (reps >= 4) document.getElementById('step1').classList.add('active');
        if (reps >= 5) {
            document.getElementById('step1').classList.add('completed');
            document.getElementById('step2').classList.add('active');
        }
        if (reps >= 6) {
            document.getElementById('step1').classList.add('completed');
            document.getElementById('step2').classList.add('completed');
            document.getElementById('step3').classList.add('active');
        }
    },

    calculateAndSave() {
        try {
            console.log('calculateAndSave called');
            const date = UI.elements.datePicker.value;
            const h = this.getFilteredHistory();
            let entry = {};

            if (this.state.currentMode === 'heavy') {
                console.log('Heavy mode logging');
                const prevVol = parseFloat(UI.elements.prevVol.value || 0);
                const heavySingle = parseFloat(UI.elements.heavySingle.value || 0);
                const quality = UI.elements.heavyQuality.value;
                const rpe = parseFloat(UI.elements.heavyRpe.value || 0);
                const overshoot = document.getElementById('overshoot').value;
                const backdownFail = document.getElementById('backdownFail').value;
                
                console.log('Inputs:', { prevVol, heavySingle, quality, rpe, overshoot, backdownFail });
                
                const nextVol = this.calculateWaveTarget(h, this.state.pivotActive);
                console.log('Next wave target:', nextVol);

                // Logic Gate Checks
                const sandbagCheck = LogicGates.checkSandbagging(rpe, backdownFail === 'no');
                const fatigueCheck = LogicGates.checkFatigue({
                    type: `${this.state.currentMode}_${this.state.currentLift}`,
                    id: 'temp',
                    performance: { topSingle: heavySingle }
                }, h);
                
                // Axial Load Check (Squat Only)
                let axialCheck = { triggered: false };
                if (this.state.currentLift === 'squat') {
                    const percentage = this.state.pivotActive ? 0.75 : 0.82;
                    const bdWeight = this.roundTo5(heavySingle * percentage);
                    
                    // Est. Axial Load: Top Single (1 rep) + Backdowns (3 sets of 3 reps)
                    const currentAxialLoad = (heavySingle * 1) + (bdWeight * 3 * 3);
                    
                    // Capacity hardcoded for now or based on user settings (e.g. 8000lbs)
                    const capacity = 9000;
                    
                    axialCheck = LogicGates.checkAxialLoad({
                        type: 'heavy_squat',
                        performance: { axialLoad: currentAxialLoad, topRPE: rpe }
                    }, capacity);
                }

                let activeFlags = [];
                if (sandbagCheck.triggered) activeFlags.push(sandbagCheck.message);
                if (fatigueCheck.triggered) activeFlags.push(fatigueCheck.message);
                if (axialCheck.triggered) activeFlags.push(axialCheck.message);

                // Display Logic Gate Status if active
                const methBox = document.getElementById('methodologyStatus');
                if (activeFlags.length > 0) {
                    methBox.style.display = 'block';
                    methBox.innerHTML = `<strong>Active Methodology Adjustments:</strong><br>${activeFlags.join('<br>')}`;
                } else {
                    methBox.style.display = 'none';
                }
                
                // Generate UUID with fallback
                let uuid;
                try {
                    uuid = crypto.randomUUID();
                } catch (e) {
                    console.warn('crypto.randomUUID failed, using fallback', e);
                    uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    });
                }
                
                entry = {
                    id: uuid,
                    type: `${this.state.currentMode}_${this.state.currentLift}`, // e.g., heavy_squat
                    date,
                    prevVol,
                    heavySingle,
                    heavyQuality: quality,
                    heavyRpe: rpe,
                    overshoot,
                    backdownFail,
                    volTarget: nextVol.weight,
                    pivot: this.state.pivotActive,
                    // Placeholders for volume logic if mixed in future, but v7.2 separates them clearly
                    volActual: null, volFail: 'no', volRpe: null, volReps: null,
                    metrics: {
                        sleep: parseInt(UI.elements.sleepInput.value),
                        stress: parseInt(UI.elements.stressInput.value)
                    },
                    logicFlags: {
                        sandbagging: sandbagCheck.triggered,
                        fatigue: fatigueCheck.triggered
                    }
                };
                
                console.log('Saving entry:', entry);
                Storage.addSession(this.state.currentUser, entry);
                alert(`Logged for ${this.state.currentUser}! Next Wave Target: ${nextVol.weight} for 3x${nextVol.reps}`);

            } else {
                // Volume Mode
                console.log('Volume mode logging');
                if (h.length === 0) {
                    alert("Log Heavy day first (per v7.2 logic).");
                    return;
                }
                
                const fullHistory = Storage.getHistory(this.state.currentUser);
                let targetIndex = -1;
                for (let i = fullHistory.length - 1; i >= 0; i--) {
                    if (fullHistory[i].type && fullHistory[i].type.includes(this.state.currentLift)) {
                        targetIndex = i;
                        break;
                    }
                }
                
                if (targetIndex === -1) {
                    alert("No previous Heavy session found to attach Volume to.");
                    return;
                }
                
                const last = fullHistory[targetIndex];
                const pivot = last.pivot || this.state.pivotActive;
                const calc = this.calculateWaveTarget(h, pivot);
                
                last.volActual = parseFloat(UI.elements.volActual.value || 0);
                last.volRpe = parseFloat(UI.elements.volRpe.value || 0);
                last.volFail = document.getElementById('volFail').value;
                last.volReps = calc.reps;
                
                fullHistory[targetIndex] = last;
                const key = `vena_history_${this.state.currentUser}`;
                localStorage.setItem(key, JSON.stringify(fullHistory));
                console.log('Updated volume entry:', last);
                alert(`Wave Logged for ${this.state.currentUser}!`);
            }
            
            // Train AI
            this.trainModel();
            console.log('Session saved successfully, reloading');
            location.reload();
        } catch (error) {
            console.error('Error in calculateAndSave:', error);
            alert('Failed to log session. Check console for details.');
        }
    },

    clearHistory() {
        console.log('clearHistory called for', this.state.currentUser, this.state.currentLift);
        if(confirm("Clear current lift data for " + this.state.currentUser + "?")) {
            // Only clear this lift type? v7.2 cleared key.
            // Here we have one big array. Filter out this lift type.
            const fullHistory = Storage.getHistory(this.state.currentUser);
            const newHistory = fullHistory.filter(h => !h.type.includes(this.state.currentLift));
            const key = `vena_history_${this.state.currentUser}`;
            localStorage.setItem(key, JSON.stringify(newHistory));
            location.reload();
        }
    },
    
    renderHistory() {
        const h = this.getFilteredHistory();
        const tbody = document.querySelector('#historyTable tbody');
        tbody.innerHTML = "";

        [...h].reverse().forEach(e => {
            const waveDisplay = e.volReps ? `3x${e.volReps}` : '-';
            const waveStatus = e.volFail === 'yes' ? '❌' : '✅';
            const pivotMarker = e.pivot ? '<span style="color:#fca5a5">[PIVOT]</span> ' : '';
            
            const row = `<tr>
                <td>${e.date}</td>
                <td>${pivotMarker}${e.heavySingle}</td>
                <td>${waveDisplay} ${waveStatus}</td>
                <td>${e.volActual || '-'}</td>
            </tr>`;
            tbody.innerHTML += row;
        });

        UI.renderChart(h, this.state.currentLift);
        UI.renderHeatmap(h);
    },

    // ==========================================
    // AI Integration
    // ==========================================

    async trainModel() {
        if (typeof AIModel !== 'undefined') {
            await AIModel.train(Storage.getHistory(this.state.currentUser));
        }
    },

    updatePrediction() {
        if (typeof AIModel === 'undefined') return;
        
        const sleep = parseInt(UI.elements.sleepInput.value);
        const stress = parseInt(UI.elements.stressInput.value);
        
        // Find days since last session
        const h = this.getFilteredHistory();
        let daysSince = 7;
        if (h.length > 0) {
            const last = h[h.length-1];
            const diff = Math.abs(new Date() - new Date(last.date));
            daysSince = Math.ceil(diff / (1000 * 60 * 60 * 24));
        }

        const prediction = AIModel.predict({
            sleep, stress, daysSinceLast: daysSince
        });

        const display = document.getElementById('ai-prediction');
        if (prediction) {
            display.innerHTML = `AI Target: <span style="color:#38bdf8; font-weight:bold;">${prediction} lbs</span>`;
        } else {
            // Heuristic Fallback
            const base = (this.state.currentLift === 'squat' ? 500 : 315); // Simple defaults
            const heuristic = AIModel.heuristicPredict(base, sleep, stress);
            display.innerHTML = `AI Target (Est): <span style="color:#94a3b8;">${heuristic} lbs</span>`;
        }
    }
};

// Start App
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});