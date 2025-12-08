/**
 * Vena-AI AI Model Module
 * Uses TensorFlow.js for linear regression to predict e1RM based on user history.
 */

const AIModel = {
    model: null,
    isTraining: false,

    async init() {
        // Define a simple linear regression model
        this.model = tf.sequential();
        this.model.add(tf.layers.dense({ units: 1, inputShape: [3] })); // Inputs: [Sleep, Stress, DaysSinceLast]
        
        // Compile the model
        this.model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });
        
        console.log("Vena-AI TensorFlow Model Initialized");
    },

    /**
     * Train the model with historical data
     * @param {Array} history - User session history
     */
    async train(history) {
        if (history.length < 5) {
            console.log("Not enough data to train model (need 5+ sessions).");
            return;
        }

        this.isTraining = true;

        // Prepare training data
        // X: [Sleep, Stress, DaysSinceLast]
        // Y: [Performance Ratio (Actual / TrainingMax)] - simplifying for stability
        
        const xs = [];
        const ys = [];
        
        // Sort history by date
        const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));

        for (let i = 1; i < sortedHistory.length; i++) {
            const current = sortedHistory[i];
            const prev = sortedHistory[i-1];
            
            // Calculate days diff
            const diffTime = Math.abs(new Date(current.date) - new Date(prev.date));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

            // Only train on heavy sessions to keep it relevant to max effort
            if (current.type.includes('heavy') && current.heavySingle > 0) {
                // Normalize inputs roughly to 0-1 range for better convergence
                // Sleep: 1-5 -> 0.2-1.0
                // Stress: 1-5 -> 0.2-1.0
                // Days: 1-14 -> 0.07-1.0 (capped)
                
                const sleepValue = current.metrics?.sleep || 3;
                const stressValue = current.metrics?.stress || 3;
                const normSleep = sleepValue / 5;
                // FIX: Invert Stress for AI training so higher value = better condition (like sleep)
                // If Stress is 1 (Good), we want 0.8 or 1.0?
                // Let's standardise: Higher Input = Higher Performance.
                // Sleep: 5 is Good -> 1.0.
                // Stress: 1 is Good -> Should be mapped to 1.0.
                // Stress: 5 is Bad -> Should be mapped to 0.2.
                // Formula: (6 - Stress) / 5.
                const normStress = (6 - stressValue) / 5;
                
                const normDays = Math.min(diffDays, 14) / 14;

                xs.push([normSleep, normStress, normDays]);
                
                // Target: We want to predict the load relative to some baseline,
                // but for this simple version, let's try to predict the raw weight directly
                // scaled down by 1000 to keep gradients controlled.
                ys.push([current.heavySingle / 1000]);
            }
        }

        if (xs.length > 0) {
            const xTensor = tf.tensor2d(xs);
            const yTensor = tf.tensor2d(ys);

            await this.model.fit(xTensor, yTensor, { epochs: 50 });
            
            xTensor.dispose();
            yTensor.dispose();
            console.log("Model training complete.");
        }
        
        this.isTraining = false;
    },

    /**
     * Predict target daily max
     * @param {Object} inputs - {sleep: 1-5, stress: 1-5, daysSinceLast: number}
     * @returns {number} Predicted Weight
     */
    predict(inputs) {
        if (!this.model) return null;
        
        // If no training has happened (weights are random), return a safe fallback or null
        // For this demo, we assume training happened or we use heuristics if not.
        
        const normSleep = inputs.sleep / 5;
        // FIX: Invert Stress for prediction too
        const normStress = (6 - inputs.stress) / 5;
        
        const normDays = Math.min(inputs.daysSinceLast, 14) / 14;
        
        const inputTensor = tf.tensor2d([[normSleep, normStress, normDays]]);
        const predictionTensor = this.model.predict(inputTensor);
        const predictionValue = predictionTensor.dataSync()[0];
        
        inputTensor.dispose();
        predictionTensor.dispose();
        
        // Scale back up
        let predictedWeight = predictionValue * 1000;
        
        // Round to nearest 5
        return Math.round(predictedWeight / 5) * 5;
    },
    
    // Heuristic fallback if ML isn't ready
    heuristicPredict(currentMax, sleep, stress) {
        // Baseline is currentMax
        // Sleep factor: 3 is neutral. 5 adds 2% (Good), 1 removes 2% (Bad)
        // Stress factor: 3 is neutral. 1 adds 2% (Good/Low Stress), 5 removes 2% (Bad/High Stress)
        
        const sleepMod = 1 + ((sleep - 3) * 0.01);
        const stressMod = 1 + ((3 - stress) * 0.01);
        
        return Math.round((currentMax * sleepMod * stressMod) / 5) * 5;
    }
};