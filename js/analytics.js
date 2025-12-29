/**
 * Vena-AI Analytics Module
 * Provides Matt Vena-style metrics: e1RM, tonnage, fatigue scoring, insights
 */

const Analytics = {

    // ==========================================
    // e1RM Calculations (RPE-based)
    // ==========================================

    /**
     * Calculate estimated 1RM using Brzycki formula with RPE adjustment
     * Based on: e1RM = Weight × (1 + 0.0333 × Reps) / RPE_Factor
     * RPE Factor accounts for reps in reserve (RIR = 10 - RPE)
     */
    calculateE1RM(weight, reps, rpe) {
        if (!weight || weight <= 0) return null;
        reps = reps || 1;
        rpe = rpe || 10;

        // RPE to percentage table (approximate)
        // RPE 10 = 100%, RPE 9 = 96%, RPE 8 = 92%, etc.
        const rpePercentages = {
            10: 1.00, 9.5: 0.98, 9: 0.96, 8.5: 0.94, 8: 0.92,
            7.5: 0.89, 7: 0.86, 6.5: 0.84, 6: 0.82
        };

        // Get RPE factor (interpolate if needed)
        let rpeFactor = rpePercentages[rpe] || (1 - (10 - rpe) * 0.04);
        rpeFactor = Math.max(0.7, Math.min(1.0, rpeFactor));

        // Brzycki formula: 1RM = Weight / (1.0278 - 0.0278 × Reps)
        // Then adjusted for RPE
        const brzycki = weight / (1.0278 - 0.0278 * reps);
        const e1rm = brzycki / rpeFactor;

        return Math.round(e1rm / 5) * 5; // Round to nearest 5
    },

    // ==========================================
    // Weekly Tonnage
    // ==========================================

    /**
     * Calculate total tonnage (volume load) for a given week
     * Tonnage = Σ(Weight × Reps × Sets)
     */
    calculateWeeklyTonnage(history, weekOffset = 0) {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() - (weekOffset * 7)); // Start of week (Sunday)
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        let tonnage = 0;

        history.forEach(session => {
            const sessionDate = new Date(session.date);
            if (sessionDate >= weekStart && sessionDate < weekEnd) {
                // Heavy single (1 rep)
                if (session.heavySingle) {
                    tonnage += session.heavySingle * 1;
                }
                // Backdowns (3x3 typically)
                if (session.heavySingle) {
                    const bdWeight = Math.round(session.heavySingle * 0.82 / 5) * 5;
                    tonnage += bdWeight * 3 * 3;
                }
                // Volume work
                if (session.volActual && session.volReps) {
                    tonnage += session.volActual * session.volReps * 3;
                }
            }
        });

        return tonnage;
    },

    /**
     * Get tonnage for last N weeks
     */
    getTonnageHistory(history, weeks = 8) {
        const result = [];
        for (let i = weeks - 1; i >= 0; i--) {
            result.push({
                weekOffset: i,
                tonnage: this.calculateWeeklyTonnage(history, i),
                label: i === 0 ? 'This Week' : `${i}w ago`
            });
        }
        return result;
    },

    // ==========================================
    // Fatigue Score
    // ==========================================

    /**
     * Calculate fatigue score based on:
     * - RPE deviation from target (8)
     * - Performance regression
     * - Volume tolerance
     * Returns 0-100 (higher = more fatigued)
     */
    calculateFatigueScore(history, liftType = 'squat') {
        const recentSessions = history
            .filter(s => s.type && s.type.includes(liftType))
            .slice(-7);

        if (recentSessions.length < 2) return null;

        let fatiguePoints = 0;
        let dataPoints = 0;

        // Factor 1: Average RPE above 8 (target)
        const avgRpe = recentSessions
            .filter(s => s.heavyRpe)
            .reduce((sum, s) => sum + s.heavyRpe, 0) / (recentSessions.filter(s => s.heavyRpe).length || 1);

        if (avgRpe > 8) {
            fatiguePoints += (avgRpe - 8) * 15; // +15 per 1 RPE above 8
        }
        dataPoints++;

        // Factor 2: Failed sessions
        const failCount = recentSessions.filter(s =>
            s.volFail === 'yes' || s.backdownFail === 'yes'
        ).length;
        fatiguePoints += failCount * 10;
        dataPoints++;

        // Factor 3: Performance regression
        const heavySessions = recentSessions.filter(s => s.heavySingle > 0);
        if (heavySessions.length >= 3) {
            const last3 = heavySessions.slice(-3).map(s => s.heavySingle);
            if (last3[2] < last3[1] && last3[1] < last3[0]) {
                fatiguePoints += 25; // 3 consecutive drops
            } else if (last3[2] < last3[1]) {
                fatiguePoints += 10; // 1 drop
            }
        }
        dataPoints++;

        // Factor 4: Pivot mode activations
        const pivotCount = recentSessions.filter(s => s.pivot).length;
        fatiguePoints += pivotCount * 5;
        dataPoints++;

        // Normalize to 0-100
        const score = Math.min(100, Math.max(0, fatiguePoints));

        return {
            score: Math.round(score),
            level: score < 30 ? 'low' : score < 60 ? 'moderate' : 'high',
            factors: {
                avgRpe: avgRpe.toFixed(1),
                failCount,
                isRegressing: fatiguePoints >= 25
            }
        };
    },

    // ==========================================
    // Strength Ratio
    // ==========================================

    /**
     * Calculate strength ratio: Current vs Peak e1RM
     */
    getStrengthRatio(history, liftType = 'squat') {
        const sessions = history.filter(s =>
            s.type && s.type.includes(liftType) && s.heavySingle > 0
        );

        if (sessions.length < 2) return null;

        // Get best e1RM ever
        let peakE1RM = 0;
        sessions.forEach(s => {
            const e1rm = this.calculateE1RM(s.heavySingle, 1, s.heavyRpe || 8);
            if (e1rm > peakE1RM) peakE1RM = e1rm;
        });

        // Get current (last session) e1RM
        const lastSession = sessions[sessions.length - 1];
        const currentE1RM = this.calculateE1RM(lastSession.heavySingle, 1, lastSession.heavyRpe || 8);

        const ratio = currentE1RM / peakE1RM;

        return {
            current: currentE1RM,
            peak: peakE1RM,
            ratio: Math.round(ratio * 100),
            status: ratio >= 0.95 ? 'peak' : ratio >= 0.85 ? 'strong' : ratio >= 0.75 ? 'building' : 'recovering'
        };
    },

    // ==========================================
    // e1RM History for Charts
    // ==========================================

    getE1RMHistory(history, liftType = 'squat') {
        return history
            .filter(s => s.type && s.type.includes(liftType) && s.heavySingle > 0)
            .map(s => ({
                date: s.date,
                actual: s.heavySingle,
                e1rm: this.calculateE1RM(s.heavySingle, 1, s.heavyRpe || 8),
                rpe: s.heavyRpe || 8
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    },

    // ==========================================
    // Training Insights (AI-like recommendations)
    // ==========================================

    generateInsights(history, liftType = 'squat') {
        const insights = [];

        const fatigue = this.calculateFatigueScore(history, liftType);
        const strength = this.getStrengthRatio(history, liftType);
        const tonnageHistory = this.getTonnageHistory(history, 4);

        // Fatigue-based insights
        if (fatigue && fatigue.level === 'high') {
            insights.push({
                type: 'warning',
                icon: '⚠️',
                title: 'High Fatigue Detected',
                text: `Your fatigue score is ${fatigue.score}/100. Consider a deload or pivot session.`
            });
        }

        // Strength ratio insights
        if (strength) {
            if (strength.status === 'peak') {
                insights.push({
                    type: 'success',
                    icon: '🏆',
                    title: 'Peak Performance',
                    text: `You're at ${strength.ratio}% of your all-time best (${strength.peak} lbs). Great work!`
                });
            } else if (strength.status === 'recovering') {
                insights.push({
                    type: 'info',
                    icon: '🔄',
                    title: 'Recovery Phase',
                    text: `Currently at ${strength.ratio}% of peak. Focus on technical work and gradual rebuilding.`
                });
            }
        }

        // Tonnage progression
        if (tonnageHistory.length >= 2) {
            const thisWeek = tonnageHistory[tonnageHistory.length - 1].tonnage;
            const lastWeek = tonnageHistory[tonnageHistory.length - 2].tonnage;
            const change = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek * 100) : 0;

            if (change > 15) {
                insights.push({
                    type: 'warning',
                    icon: '📈',
                    title: 'Volume Spike',
                    text: `Tonnage up ${change.toFixed(0)}% vs last week. Monitor recovery carefully.`
                });
            } else if (change < -20 && thisWeek > 0) {
                insights.push({
                    type: 'info',
                    icon: '📉',
                    title: 'Reduced Volume',
                    text: `Tonnage down ${Math.abs(change).toFixed(0)}%. Good if intentional deload.`
                });
            }
        }

        // RPE calibration
        if (fatigue && parseFloat(fatigue.factors.avgRpe) > 8.5) {
            insights.push({
                type: 'tip',
                icon: '💡',
                title: 'RPE Running High',
                text: `Average RPE is ${fatigue.factors.avgRpe}. Consider targeting RPE 7-8 for sustainable progress.`
            });
        }

        // Default positive insight
        if (insights.length === 0) {
            insights.push({
                type: 'success',
                icon: '✅',
                title: 'On Track',
                text: 'Training metrics look balanced. Keep executing the plan!'
            });
        }

        return insights;
    }
};
