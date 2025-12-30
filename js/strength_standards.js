/**
 * Strength Standards Module
 * Provides percentile rankings for powerlifting lifts based on body weight and gender.
 * Data derived from IPF/USAPL classification standards and OpenPowerlifting aggregated data.
 * 
 * Attribution: Uses research from OpenPowerlifting project (https://www.openpowerlifting.org)
 */

const StrengthStandards = {
    // Weight classes in kg (IPF standard)
    WEIGHT_CLASSES: {
        male: [52, 56, 60, 67.5, 75, 82.5, 90, 100, 110, 125, 140, 999],
        female: [43, 47, 52, 56, 60, 67.5, 75, 82.5, 90, 999]
    },

    // Percentile thresholds by weight class (in kg)
    // Each array: [5th, 20th, 40th, 50th, 60th, 75th, 85th, 90th, 95th, 99th percentile]
    // Values represent 1RM in kg for raw, drug-tested lifters

    SQUAT_STANDARDS: {
        male: {
            // ~115 lb / 52kg class
            52: [40, 60, 80, 95, 110, 130, 150, 165, 185, 215],
            // ~123 lb / 56kg class
            56: [45, 70, 90, 105, 120, 140, 160, 180, 200, 230],
            // ~132 lb / 60kg class
            60: [50, 75, 100, 115, 130, 155, 175, 195, 215, 250],
            // ~148 lb / 67.5kg class
            67.5: [55, 85, 110, 125, 145, 170, 195, 215, 240, 275],
            // ~165 lb / 75kg class
            75: [60, 90, 120, 140, 160, 185, 210, 235, 260, 300],
            // ~181 lb / 82.5kg class
            82.5: [65, 100, 130, 150, 175, 200, 230, 255, 285, 325],
            // ~198 lb / 90kg class
            90: [70, 105, 140, 160, 185, 215, 245, 275, 305, 350],
            // ~220 lb / 100kg class
            100: [75, 115, 150, 175, 200, 235, 265, 300, 330, 380],
            // ~242 lb / 110kg class
            110: [80, 120, 160, 185, 215, 250, 285, 320, 355, 405],
            // ~275 lb / 125kg class
            125: [85, 125, 165, 195, 225, 265, 300, 340, 375, 430],
            // 308+ lb / 140kg+ class
            140: [90, 130, 175, 205, 240, 280, 320, 360, 400, 455],
            999: [90, 130, 175, 205, 240, 280, 320, 360, 400, 455]
        },
        female: {
            43: [25, 40, 55, 65, 75, 90, 105, 115, 130, 155],
            47: [30, 45, 60, 70, 80, 95, 115, 125, 145, 170],
            52: [32, 50, 65, 75, 90, 105, 125, 140, 160, 185],
            56: [35, 55, 70, 85, 100, 115, 135, 150, 175, 200],
            60: [38, 60, 80, 92, 108, 125, 145, 165, 190, 220],
            67.5: [42, 65, 88, 100, 118, 140, 160, 180, 205, 240],
            75: [45, 70, 95, 110, 128, 150, 175, 195, 225, 260],
            82.5: [48, 75, 100, 118, 138, 162, 188, 210, 240, 280],
            90: [50, 80, 108, 125, 148, 172, 200, 225, 255, 295],
            999: [50, 80, 108, 125, 148, 172, 200, 225, 255, 295]
        }
    },

    BENCH_STANDARDS: {
        male: {
            52: [25, 40, 55, 65, 75, 90, 105, 115, 130, 155],
            56: [30, 45, 60, 72, 85, 100, 115, 130, 145, 170],
            60: [32, 50, 68, 80, 95, 110, 130, 145, 165, 190],
            67.5: [38, 58, 78, 92, 108, 128, 150, 168, 190, 220],
            75: [42, 65, 88, 102, 120, 142, 165, 185, 210, 245],
            82.5: [48, 72, 98, 115, 135, 158, 185, 205, 235, 270],
            90: [52, 80, 108, 125, 148, 175, 200, 225, 255, 295],
            100: [58, 88, 118, 138, 162, 190, 220, 248, 280, 325],
            110: [62, 95, 128, 150, 175, 205, 240, 270, 305, 350],
            125: [68, 100, 138, 162, 190, 222, 258, 290, 330, 375],
            140: [72, 108, 148, 172, 202, 238, 275, 310, 350, 400],
            999: [72, 108, 148, 172, 202, 238, 275, 310, 350, 400]
        },
        female: {
            43: [15, 25, 35, 42, 50, 60, 72, 82, 95, 115],
            47: [18, 30, 42, 50, 60, 72, 85, 95, 110, 135],
            52: [20, 32, 48, 55, 68, 80, 95, 108, 125, 150],
            56: [22, 38, 52, 62, 75, 90, 105, 120, 138, 165],
            60: [25, 42, 58, 70, 82, 98, 115, 130, 152, 180],
            67.5: [28, 48, 65, 78, 92, 110, 128, 145, 168, 198],
            75: [30, 52, 72, 85, 100, 120, 140, 160, 185, 215],
            82.5: [32, 55, 78, 92, 108, 130, 152, 172, 200, 232],
            90: [35, 60, 85, 100, 118, 140, 165, 188, 218, 252],
            999: [35, 60, 85, 100, 118, 140, 165, 188, 218, 252]
        }
    },

    DEADLIFT_STANDARDS: {
        male: {
            52: [50, 75, 100, 115, 135, 160, 180, 200, 225, 260],
            56: [55, 85, 110, 128, 150, 175, 200, 220, 250, 285],
            60: [60, 92, 122, 142, 165, 192, 220, 245, 275, 315],
            67.5: [68, 102, 138, 158, 185, 215, 248, 275, 308, 350],
            75: [75, 115, 152, 178, 205, 240, 275, 305, 340, 390],
            82.5: [82, 125, 168, 195, 225, 262, 300, 335, 375, 425],
            90: [88, 135, 180, 210, 242, 282, 325, 362, 405, 460],
            100: [95, 148, 198, 230, 265, 310, 355, 398, 445, 505],
            110: [102, 158, 212, 248, 285, 335, 385, 430, 480, 545],
            125: [108, 168, 225, 265, 305, 358, 410, 460, 515, 580],
            140: [115, 178, 240, 280, 325, 380, 438, 490, 548, 620],
            999: [115, 178, 240, 280, 325, 380, 438, 490, 548, 620]
        },
        female: {
            43: [32, 50, 68, 80, 95, 112, 130, 148, 170, 200],
            47: [38, 58, 78, 92, 108, 128, 150, 170, 195, 228],
            52: [42, 65, 88, 102, 122, 145, 168, 190, 218, 255],
            56: [48, 72, 98, 115, 135, 160, 188, 212, 242, 285],
            60: [52, 80, 108, 128, 150, 178, 208, 235, 268, 315],
            67.5: [58, 88, 120, 142, 168, 198, 230, 260, 298, 350],
            75: [62, 98, 132, 155, 182, 218, 252, 285, 328, 385],
            82.5: [68, 105, 142, 168, 198, 235, 275, 310, 355, 418],
            90: [72, 112, 155, 182, 215, 255, 298, 338, 388, 455],
            999: [72, 112, 155, 182, 215, 255, 298, 338, 388, 455]
        }
    },

    // Percentile values corresponding to the standards arrays
    PERCENTILES: [5, 20, 40, 50, 60, 75, 85, 90, 95, 99],

    // Classification thresholds (percentile-based)
    CLASSIFICATIONS: [
        { min: 95, name: "Elite", emoji: "👑", color: "#fbbf24" },
        { min: 85, name: "Master", emoji: "🏆", color: "#818cf8" },
        { min: 75, name: "Class I", emoji: "💎", color: "#60a5fa" },
        { min: 60, name: "Class II", emoji: "🔥", color: "#34d399" },
        { min: 40, name: "Class III", emoji: "💪", color: "#a78bfa" },
        { min: 20, name: "Class IV", emoji: "🎯", color: "#f472b6" },
        { min: 0, name: "Class V", emoji: "🌱", color: "#94a3b8" }
    ],

    /**
     * Convert lbs to kg
     */
    lbsToKg(lbs) {
        return lbs * 0.453592;
    },

    /**
     * Convert kg to lbs
     */
    kgToLbs(kg) {
        return kg / 0.453592;
    },

    /**
     * Get the appropriate weight class for a body weight
     */
    getWeightClass(bodyweightKg, gender) {
        const classes = this.WEIGHT_CLASSES[gender] || this.WEIGHT_CLASSES.male;
        for (const wc of classes) {
            if (bodyweightKg <= wc) return wc;
        }
        return classes[classes.length - 1];
    },

    /**
     * Interpolate percentile from standards array
     */
    interpolatePercentile(liftKg, standards) {
        // Below minimum
        if (liftKg <= standards[0]) {
            return Math.max(1, Math.round((liftKg / standards[0]) * 5));
        }

        // Above maximum
        if (liftKg >= standards[standards.length - 1]) {
            return 99;
        }

        // Find position in array
        for (let i = 0; i < standards.length - 1; i++) {
            if (liftKg >= standards[i] && liftKg < standards[i + 1]) {
                const range = standards[i + 1] - standards[i];
                const position = (liftKg - standards[i]) / range;
                const percentileRange = this.PERCENTILES[i + 1] - this.PERCENTILES[i];
                return Math.round(this.PERCENTILES[i] + (position * percentileRange));
            }
        }

        return 50; // Fallback
    },

    /**
     * Get classification based on percentile
     */
    getClassification(percentile) {
        for (const cls of this.CLASSIFICATIONS) {
            if (percentile >= cls.min) {
                return cls;
            }
        }
        return this.CLASSIFICATIONS[this.CLASSIFICATIONS.length - 1];
    },

    /**
     * Main function: Get percentile for a lift
     * @param {string} lift - 'squat', 'bench', or 'deadlift'
     * @param {number} weightLbs - The lift weight in pounds
     * @param {number} bodyweightLbs - User's body weight in pounds
     * @param {string} gender - 'male' or 'female'
     * @returns {Object} { percentile, classification, message, weightClass }
     */
    getPercentile(lift, weightLbs, bodyweightLbs, gender = 'male') {
        // Convert to kg
        const weightKg = this.lbsToKg(weightLbs);
        const bodyweightKg = this.lbsToKg(bodyweightLbs);

        // Get weight class
        const weightClass = this.getWeightClass(bodyweightKg, gender);
        const weightClassLbs = Math.round(this.kgToLbs(weightClass));

        // Get standards for this lift, gender, and weight class
        let standards;
        switch (lift.toLowerCase()) {
            case 'squat':
                standards = this.SQUAT_STANDARDS[gender]?.[weightClass];
                break;
            case 'bench':
                standards = this.BENCH_STANDARDS[gender]?.[weightClass];
                break;
            case 'deadlift':
                standards = this.DEADLIFT_STANDARDS[gender]?.[weightClass];
                break;
            default:
                return { percentile: 0, classification: null, message: "Unknown lift" };
        }

        if (!standards) {
            return { percentile: 0, classification: null, message: "No data for this weight class" };
        }

        // Calculate percentile
        const percentile = this.interpolatePercentile(weightKg, standards);
        const classification = this.getClassification(percentile);

        // Generate motivational message
        let message;
        if (percentile >= 99) {
            message = "🌟 World-class! Stronger than 99% of lifters!";
        } else if (percentile >= 95) {
            message = `${classification.emoji} Elite level! Stronger than ${percentile}% of lifters!`;
        } else if (percentile >= 85) {
            message = `${classification.emoji} Master level! Stronger than ${percentile}% of lifters!`;
        } else if (percentile >= 75) {
            message = `${classification.emoji} Impressive! Stronger than ${percentile}% of lifters your size!`;
        } else if (percentile >= 50) {
            message = `${classification.emoji} Above average! Stronger than ${percentile}% of lifters!`;
        } else if (percentile >= 25) {
            message = `${classification.emoji} Keep pushing! Stronger than ${percentile}% of lifters!`;
        } else {
            message = `${classification.emoji} Building your foundation! Great progress ahead!`;
        }

        return {
            percentile,
            classification,
            message,
            weightClass,
            weightClassLbs,
            liftKg: Math.round(weightKg * 10) / 10
        };
    },

    /**
     * Get comparison insights for all lifts
     * @param {Object} userData - { squat1RM, bench1RM, deadlift1RM, bodyweight, gender }
     * @returns {Object} Combined analysis
     */
    getComparisonInsights(userData) {
        const { squat1RM, bench1RM, deadlift1RM, bodyweight, gender = 'male' } = userData;

        const results = {
            squat: squat1RM ? this.getPercentile('squat', squat1RM, bodyweight, gender) : null,
            bench: bench1RM ? this.getPercentile('bench', bench1RM, bodyweight, gender) : null,
            deadlift: deadlift1RM ? this.getPercentile('deadlift', deadlift1RM, bodyweight, gender) : null
        };

        // Calculate average percentile across available lifts
        const validResults = Object.values(results).filter(r => r !== null);
        const averagePercentile = validResults.length > 0
            ? Math.round(validResults.reduce((sum, r) => sum + r.percentile, 0) / validResults.length)
            : 0;

        const overallClassification = this.getClassification(averagePercentile);

        // Find strongest and weakest lifts
        let strongest = null, weakest = null;
        for (const [lift, data] of Object.entries(results)) {
            if (data) {
                if (!strongest || data.percentile > strongest.percentile) {
                    strongest = { lift, ...data };
                }
                if (!weakest || data.percentile < weakest.percentile) {
                    weakest = { lift, ...data };
                }
            }
        }

        // Generate overall message
        let overallMessage;
        if (averagePercentile >= 90) {
            overallMessage = `👑 Elite Powerlifter! Stronger than ${averagePercentile}% in your class!`;
        } else if (averagePercentile >= 75) {
            overallMessage = `🏆 Outstanding! Stronger than ${averagePercentile}% of lifters your size!`;
        } else if (averagePercentile >= 50) {
            overallMessage = `💪 Above Average! Stronger than ${averagePercentile}% of lifters!`;
        } else {
            overallMessage = `🎯 Building strength! Stronger than ${averagePercentile}% - keep it up!`;
        }

        return {
            lifts: results,
            averagePercentile,
            overallClassification,
            overallMessage,
            strongest,
            weakest,
            bodyweight,
            gender,
            weightClass: validResults[0]?.weightClass,
            weightClassLbs: validResults[0]?.weightClassLbs
        };
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.StrengthStandards = StrengthStandards;
}
