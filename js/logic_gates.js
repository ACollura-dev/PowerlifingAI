/**
 * Vena-AI Logic Gates Module
 * Implements specific decision trees for training adjustments.
 */

const LogicGates = {
    
    /**
     * Gate A: RPE-Correction ("Sandbagging Detector")
     * Checks if the user undershot RPE on the top single but failed volume.
     */
    checkSandbagging(topRPE, volumeSuccess) {
        // Trigger: If Heavy Single RPE <= 7.5 AND Volume Success = FALSE
        if (topRPE <= 7.5 && !volumeSuccess) {
            return {
                triggered: true,
                message: "Focus Mismatch Detected: Easy top single but failed back-off.",
                action: "increase_volume_intensity"
            };
        }
        return { triggered: false };
    },

    /**
     * Gate B: Fatigue-Intervention
     * Checks for regression in top strength over 2 consecutive sessions.
     */
    checkFatigue(currentSession, userHistory) {
        const type = currentSession.type;
        // Only relevant for heavy days
        if (!type.includes('heavy')) return { triggered: false };

        // Get previous sessions of same type
        const prevSessions = userHistory
            .filter(s => s.type === type && s.id !== currentSession.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (prevSessions.length < 2) return { triggered: false };

        const last1 = prevSessions[0];
        const last2 = prevSessions[1];
        
        const currentTop = currentSession.performance.topSingle;
        const last1Top = last1.performance.topSingle;
        const last2Top = last2.performance.topSingle;

        // Trigger: If TopSingle < Previous for 2 consecutive sessions (Current < Last1 < Last2)
        // Or strictly: Current < Last1 AND Last1 < Last2
        if (currentTop < last1Top && last1Top < last2Top) {
            return {
                triggered: true,
                message: "Fatigue accumulation detected. Performance regression over 3 sessions.",
                action: "activate_pivot"
            };
        }

        return { triggered: false };
    },

    /**
     * Gate C: Axial Load Monitor
     * Checks spinal loading from heavy squat sessions to adjust Saturday wave work.
     */
    checkAxialLoad(sessionData, maxCapacity) {
        if (sessionData.type !== 'heavy_squat') return { triggered: false };

        const load = sessionData.performance.axialLoad;
        const rpe = sessionData.performance.topRPE;

        // Trigger: If Axial Load > Capacity OR RPE > 9
        if (load > maxCapacity || rpe > 9) {
            return {
                triggered: true,
                message: "High Systemic Fatigue. Saturday session should be adjusted.",
                action: "reduce_saturday_load"
            };
        }

        return { triggered: false };
    },

    // Helper to calculate estimated axial load
    calculateAxialLoad(topSet, backdownSets) {
        let load = topSet.weight * topSet.reps; // Usually 1 rep
        
        backdownSets.forEach(set => {
            load += (set.weight * set.reps * set.sets);
        });

        return load;
    },
    
    // Helper to determine next session adjustments based on active flags
    getNextSessionPlan(dayOfWeek, history, schedule) {
        // Simple look-ahead logic
        // This would be called when rendering the dashboard
        const adjustments = {
            message: "Standard Plan",
            loadModifier: 1.0,
            variation: "standard"
        };
        
        // Check last session for flags
        const lastSession = history[history.length - 1];
        if (!lastSession) return adjustments;

        if (lastSession.logicFlags.fatigueTriggered) {
             adjustments.message = "Pivot Block Active: Deload Requested.";
             adjustments.loadModifier = 0.85;
             adjustments.variation = "pivot";
             return adjustments;
        }

        if (lastSession.dayOfWeek === 2 && dayOfWeek === 6) { // Tuesday -> Saturday
            // Check Axial load flag from Tuesday
            // In a real DB we'd query by date, here we just look at the last session if it was Tuesday
            if (lastSession.type === 'heavy_squat' && lastSession.logicFlags.axialLoadHigh) {
                adjustments.message = "High Axial Fatigue from Tuesday. Reducing load.";
                adjustments.loadModifier = 0.95;
                adjustments.variation = "pause_squat";
            }
        }
        
        return adjustments;
    }
};