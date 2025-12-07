/**
 * Vena-AI UI Renderer Module
 * Handles DOM manipulation and View updates.
 * Adapted for v7.2 HTML Structure.
 */

const UI = {
    elements: {
        // Tab Nav
        tabPlanner: document.getElementById('tab-planner'),
        tabAnalysis: document.getElementById('tab-analysis'),
        viewPlanner: document.getElementById('view-planner'),
        viewAnalysis: document.getElementById('view-analysis'),

        // User & Lift Selectors
        btnUserAnthony: document.getElementById('btnUserAnthony'),
        btnUserSeth: document.getElementById('btnUserSeth'),
        btnSelectSquat: document.getElementById('btnSelectSquat'),
        btnSelectBench: document.getElementById('btnSelectBench'),

        // Core Inputs
        datePicker: document.getElementById('date'),
        
        // AI Readiness
        sleepInput: document.getElementById('sleep-score'),
        sleepVal: document.getElementById('sleep-val'),
        stressInput: document.getElementById('stress-score'),
        stressVal: document.getElementById('stress-val'),
        predictionDisplay: document.getElementById('ai-prediction'),

        // Voice
        voiceBtn: document.getElementById('voice-btn'),

        // Mode Switcher
        btnHeavy: document.getElementById('btnHeavy'),
        btnVol: document.getElementById('btnVol'),
        sectionHeavy: document.getElementById('sectionHeavy'),
        sectionVol: document.getElementById('sectionVol'),

        // Heavy Inputs
        heavySingle: document.getElementById('heavySingle'),
        heavyRpe: document.getElementById('heavyRpe'),
        heavyQuality: document.getElementById('heavyQuality'),
        prevVol: document.getElementById('prevVol'),
        warmupPreviewHeavy: document.getElementById('warmupPreviewHeavy'),
        plateLoadingBox: document.getElementById('plateLoadingBox'),
        heavySuggestionBox: document.getElementById('heavySuggestionBox'),
        
        // Volume Inputs
        volActual: document.getElementById('volActual'),
        volRpe: document.getElementById('volRpe'),
        warmupPreviewVol: document.getElementById('warmupPreviewVol'),
        volPlateLoadingBox: document.getElementById('volPlateLoadingBox'),

        // Action Buttons
        btnLogSession: document.getElementById('btnLogSession'),
        btnExport: document.getElementById('btnExport'),
        importFile: document.getElementById('importFile'),
        btnImportTrigger: document.getElementById('btnImportTrigger'),
        btnClearHistory: document.getElementById('btnClearHistory'),

        // Charts
        chartCanvas: document.getElementById('progress-chart'),
        heatmapContainer: document.getElementById('heatmap-container'),
        
        // Protocol
        pivotMode: document.getElementById('pivotMode'),
        protocolBanner: document.getElementById('protocolBanner'),
        systemStatus: document.getElementById('systemStatus')
    },
    
    chartInstance: null,

    init() {
        this.bindEvents();
        this.setToday();
    },

    bindEvents() {
        console.log('UI.bindEvents called');
        // Range slider updates
        this.elements.sleepInput.addEventListener('input', (e) => {
            this.elements.sleepVal.textContent = e.target.value;
            App.updatePrediction();
        });
        this.elements.stressInput.addEventListener('input', (e) => {
            this.elements.stressVal.textContent = e.target.value;
            App.updatePrediction();
        });

        // Tab Switching
        this.elements.tabPlanner.addEventListener('click', () => this.switchTab('planner'));
        this.elements.tabAnalysis.addEventListener('click', () => this.switchTab('analysis'));

        // User Switching
        this.elements.btnUserAnthony.addEventListener('click', () => App.switchUser('Anthony'));
        this.elements.btnUserSeth.addEventListener('click', () => App.switchUser('Seth'));

        // Lift Switching
        this.elements.btnSelectSquat.addEventListener('click', () => App.switchLift('squat'));
        this.elements.btnSelectBench.addEventListener('click', () => App.switchLift('bench'));

        // Mode Switching
        this.elements.btnHeavy.addEventListener('click', () => App.setMode('heavy'));
        this.elements.btnVol.addEventListener('click', () => App.setMode('vol'));

        // Pivot Toggle
        this.elements.pivotMode.addEventListener('change', () => App.togglePivot());

        // Live Calculations (Plate Loading / Warmups)
        this.elements.heavySingle.addEventListener('input', () => App.liveUpdateHeavy());
        this.elements.volActual.addEventListener('input', () => App.previewVolWarmup());
        
        // Log Session
        this.elements.btnLogSession.addEventListener('click', () => App.calculateAndSave());

        // Voice Command
        this.elements.voiceBtn.addEventListener('click', () => this.startVoiceInput());
        
        // Data Management
        this.elements.btnExport.addEventListener('click', () => Storage.exportData());
        this.elements.btnImportTrigger.addEventListener('click', () => this.elements.importFile.click());
        this.elements.importFile.addEventListener('change', (e) => Storage.importData(e.target));
        console.log('btnClearHistory element:', this.elements.btnClearHistory);
        // Add both click and touchstart for mobile compatibility
        const clearHistoryHandler = () => {
            console.log('Reset Current User button triggered (click/touch)');
            App.clearHistory();
        };
        this.elements.btnClearHistory.addEventListener('click', clearHistoryHandler);
        this.elements.btnClearHistory.addEventListener('touchstart', clearHistoryHandler);
    },

    startVoiceInput() {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Speech recognition not supported in this browser.");
            return;
        }

        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        this.elements.voiceBtn.classList.add('listening');
        
        recognition.start();

        recognition.onresult = (event) => {
            const last = event.results.length - 1;
            const command = event.results[last][0].transcript.toLowerCase();
            console.log('Voice Command:', command);
            this.processVoiceCommand(command);
        };

        recognition.onend = () => {
            this.elements.voiceBtn.classList.remove('listening');
        };
    },

    processVoiceCommand(command) {
        // 1. Top Single
        const topMatch = command.match(/(top|single|weight)\s+(\d+)/);
        if (topMatch) {
            this.elements.heavySingle.value = topMatch[2];
            App.liveUpdateHeavy();
        }

        // 2. RPE
        const rpeMatch = command.match(/(rpe|rate)\s+(\d+(\.\d+)?)/);
        if (rpeMatch) {
            this.elements.heavyRpe.value = rpeMatch[2];
        }

        // 3. Sleep/Stress
        const sleepMatch = command.match(/sleep\s+(\d)/);
        if (sleepMatch) {
            this.elements.sleepInput.value = sleepMatch[1];
            this.elements.sleepVal.textContent = sleepMatch[1];
            App.updatePrediction();
        }
    },

    setToday() {
        const today = new Date().toISOString().split('T')[0];
        this.elements.datePicker.value = today;
    },

    switchTab(tabName) {
        if (tabName === 'planner') {
            this.elements.tabPlanner.classList.add('active');
            this.elements.tabAnalysis.classList.remove('active');
            this.elements.viewPlanner.classList.add('active');
            this.elements.viewAnalysis.classList.remove('active');
        } else {
            this.elements.tabPlanner.classList.remove('active');
            this.elements.tabAnalysis.classList.add('active');
            this.elements.viewPlanner.classList.remove('active');
            this.elements.viewAnalysis.classList.add('active');
            App.renderHistory(); // Refresh charts
        }
    },
    
    // Original v7.2 Helper Functions ported to UI module
    getPlateLoading(weight) {
        if(!weight || weight < 45) return "Bar";
        let target = (weight - 45) / 2;
        let plates = [45, 35, 25, 10, 5, 2.5];
        let result = [];
        for(let p of plates) {
            while(target >= p) { result.push(p); target -= p; }
        }
        return result.length ? result.join(" + ") : "Bar";
    },

    generateWarmup(target, liftType) {
        if(!target || target < 45) return "";
        let warmups = [];
        let milestones = [135, 185, 225, 275, 315, 365, 405, 455, 495, 545, 585];
        if (liftType === 'bench') milestones = [135, 185, 225, 275, 315, 365, 405];
        
        warmups.push("Bar");
        milestones.forEach(m => { if(m <= target - 35) warmups.push(m); });
        
        let lastWeight = warmups.length > 1 ? warmups[warmups.length-1] : 45;
        let gap = target - lastWeight;
        
        if(gap > 50) {
            let bridge = Math.round((lastWeight + (gap * 0.6)) / 5) * 5;
            if (bridge < target - 15) warmups.push(bridge);
        }
        return warmups.join(", ") + ", Top";
    },

    renderChart(history, currentLift) {
        const ctx = this.elements.chartCanvas.getContext('2d');
        const data = history.map(e => e.heavySingle).filter(v => v > 0);
        
        // Destroy old chart if exists
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        if (data.length < 2) return;

        const labels = history.map(e => e.date);
        const color = currentLift === 'squat' ? '#38bdf8' : '#f472b6';

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Top Single',
                    data: data,
                    borderColor: color,
                    tension: 0.2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: false, grid: { color: '#334155' } },
                    x: { grid: { display: false } }
                }
            }
        });
    },

    renderHeatmap(history) {
        const container = this.elements.heatmapContainer;
        container.innerHTML = '';
        
        // Simple 30 day visualization
        const now = new Date();
        const dates = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            dates.push(d.toISOString().split('T')[0]);
        }
        
        dates.forEach(date => {
            const div = document.createElement('div');
            const hasSession = history.some(h => h.date === date);
            div.className = `heatmap-cell ${hasSession ? 'completed' : ''}`;
            div.title = date;
            container.appendChild(div);
        });
    }
};