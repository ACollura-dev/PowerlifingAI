// Test wave logic from app.js
const App = {
    state: {
        currentLift: 'squat'
    },
    roundTo5(x) { return Math.round(x / 5) * 5; },
    calculateWaveTarget(history, pivot) {
        let lastRealVol = null;
        
        // Find the last non-pivot volume session
        for(let i=history.length-1; i>=0; i--) {
            if(history[i].volActual && !history[i].pivot) { lastRealVol = history[i]; break; }
        }

        // --- PIVOT LOGIC (Deload) ---
        if (pivot) {
             // If pivot is on, we take ~85% of your "normal" volume weight
             let refWeight = lastRealVol ? lastRealVol.volActual : (this.state.currentLift==='squat'?365:225);
             let targetWeight = this.roundTo5(refWeight * 0.85);
             return {
                 weight: targetWeight,
                 reps: 3,
                 note: "PIVOT: Speed/Tech work only. Do not grind.",
                 isPause: true
             };
        }

        // --- STANDARD "VENA" LOGIC ---
        // Default Starting Weights if no history exists
        let targetWeight = (this.state.currentLift === 'squat') ? 315 : 225;
        let targetReps = 4; // STATIC REPS (Vena style: keep reps low/consistent)
        let note = "Establish Baseline";

        if (lastRealVol) {
            const lastWeight = lastRealVol.volActual;
            // Default RPE to 7.5 if user didn't log it, to keep progression moving
            const lastRpe = lastRealVol.volRpe || 7.5;
            const success = (lastRealVol.volFail === 'no');

            if (!success) {
                // Scenario: You physically failed a rep
                targetWeight = this.roundTo5(lastWeight - 15);
                note = "REGRESSION: Missed reps last time. Rebuild momentum.";
            } else {
                // Scenario: You hit the reps, calculate load based on RPE
                if (lastRpe <= 6) {
                    targetWeight = lastWeight + 10;
                    note = "EASY: +10lbs. (Last was RPE ≤ 6)";
                } else if (lastRpe <= 7.5) {
                    targetWeight = lastWeight + 5;
                    note = "PROGRESS: +5lbs. (Last was RPE 6-7.5)";
                } else if (lastRpe <= 8.5) {
                    targetWeight = lastWeight;
                    note = "CONSOLIDATE: Repeat weight. (Last was RPE 8+)";
                } else {
                    targetWeight = this.roundTo5(lastWeight - 10);
                    note = "DELOAD: Last session was RPE 9+. Drop weight.";
                }
            }
        }
        
        // Add the "Safety Valve" instruction for today
        note += " [If Set 1 is > RPE 8, drop 5%]";

        return { weight: targetWeight, reps: targetReps, note, isPause: false };
    },
    getWaveStepLabel(note) {
        // Map note to a descriptive label
        if (note.includes('PIVOT:')) {
            return 'Pivot: Technical Work';
        }
        if (note.includes('EASY:') || note.includes('PROGRESS:')) {
            return 'Step Up: Add Volume';
        }
        if (note.includes('CONSOLIDATE:')) {
            return 'Consolidate: Maintain Volume';
        }
        if (note.includes('REGRESSION:') || note.includes('DELOAD:')) {
            return 'Step Down: Reduce Volume';
        }
        if (note.includes('Establish Baseline')) {
            return 'Baseline: Establish Volume';
        }
        // Fallback
        return note;
    },
    updateWaveVisuals(result) {
        // result can be a number (reps) for backward compatibility, or an object with note and reps
        let note = '';
        let reps = 0;
        if (typeof result === 'object' && result !== null) {
            note = result.note || '';
            reps = result.reps || 0;
        } else {
            reps = result;
        }

        // Determine step based on note
        let activeStep = 1;
        let completedSteps = [];

        if (note.includes('PIVOT:')) {
            // Pivot mode: special visual (maybe all steps dimmed)
            activeStep = 1;
            completedSteps = [];
        } else if (note.includes('EASY:') || note.includes('PROGRESS:') || note.includes('Establish Baseline')) {
            activeStep = 1; // Step Up
            completedSteps = [];
        } else if (note.includes('CONSOLIDATE:')) {
            activeStep = 2; // Consolidate
            completedSteps = [1];
        } else if (note.includes('REGRESSION:') || note.includes('DELOAD:')) {
            activeStep = 3; // Step Down
            completedSteps = [1, 2];
        } else {
            // Fallback to reps logic (original)
            if (reps >= 4) activeStep = 1;
            if (reps >= 5) { activeStep = 2; completedSteps = [1]; }
            if (reps >= 6) { activeStep = 3; completedSteps = [1, 2]; }
        }

        return { activeStep, completedSteps, note, reps };
    }
};

// Test scenarios
console.log('Testing wave logic...\n');

// Helper to create history entry
function createEntry(volActual, volRpe, volFail, pivot = false) {
    return { volActual, volRpe, volFail, pivot };
}

// Scenario 1: No history, no pivot
let history = [];
let result = App.calculateWaveTarget(history, false);
console.log('Scenario 1 (no history):');
console.log('  Note:', result.note);
console.log('  Weight:', result.weight);
console.log('  Reps:', result.reps);
let visual = App.updateWaveVisuals(result);
console.log('  Active Step:', visual.activeStep);
console.log('  Completed Steps:', visual.completedSteps);
console.log('  Label:', App.getWaveStepLabel(result.note));
console.log();

// Scenario 2: Last volume easy (RPE 6)
history = [createEntry(315, 6, 'no')];
result = App.calculateWaveTarget(history, false);
console.log('Scenario 2 (easy RPE 6):');
console.log('  Note:', result.note);
console.log('  Weight:', result.weight);
visual = App.updateWaveVisuals(result);
console.log('  Active Step:', visual.activeStep);
console.log('  Completed Steps:', visual.completedSteps);
console.log();

// Scenario 3: Last volume moderate (RPE 7.5)
history = [createEntry(315, 7.5, 'no')];
result = App.calculateWaveTarget(history, false);
console.log('Scenario 3 (progress RPE 7.5):');
console.log('  Note:', result.note);
console.log('  Weight:', result.weight);
visual = App.updateWaveVisuals(result);
console.log('  Active Step:', visual.activeStep);
console.log('  Completed Steps:', visual.completedSteps);
console.log();

// Scenario 4: Last volume hard (RPE 8.5)
history = [createEntry(315, 8.5, 'no')];
result = App.calculateWaveTarget(history, false);
console.log('Scenario 4 (consolidate RPE 8.5):');
console.log('  Note:', result.note);
console.log('  Weight:', result.weight);
visual = App.updateWaveVisuals(result);
console.log('  Active Step:', visual.activeStep);
console.log('  Completed Steps:', visual.completedSteps);
console.log();

// Scenario 5: Last volume very hard (RPE 9.5)
history = [createEntry(315, 9.5, 'no')];
result = App.calculateWaveTarget(history, false);
console.log('Scenario 5 (deload RPE 9.5):');
console.log('  Note:', result.note);
console.log('  Weight:', result.weight);
visual = App.updateWaveVisuals(result);
console.log('  Active Step:', visual.activeStep);
console.log('  Completed Steps:', visual.completedSteps);
console.log();

// Scenario 6: Last volume failed (volFail yes)
history = [createEntry(315, 7, 'yes')];
result = App.calculateWaveTarget(history, false);
console.log('Scenario 6 (failed reps):');
console.log('  Note:', result.note);
console.log('  Weight:', result.weight);
visual = App.updateWaveVisuals(result);
console.log('  Active Step:', visual.activeStep);
console.log('  Completed Steps:', visual.completedSteps);
console.log();

// Scenario 7: Pivot mode with history
history = [createEntry(315, 7, 'no')];
result = App.calculateWaveTarget(history, true);
console.log('Scenario 7 (pivot true):');
console.log('  Note:', result.note);
console.log('  Weight:', result.weight);
visual = App.updateWaveVisuals(result);
console.log('  Active Step:', visual.activeStep);
console.log('  Completed Steps:', visual.completedSteps);
console.log('  Label:', App.getWaveStepLabel(result.note));
console.log();

// Edge case: note with suffix
let note = "EASY: +10lbs. (Last was RPE ≤ 6) [If Set 1 is > RPE 8, drop 5%]";
console.log('Testing note suffix handling:');
console.log('  Includes EASY?', note.includes('EASY:'));
console.log('  Label:', App.getWaveStepLabel(note));