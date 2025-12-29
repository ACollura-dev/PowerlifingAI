/**
 * Vena-AI AI Model Module
 * Uses TensorFlow.js for linear regression to predict e1RM based on user history.
 * Enhanced with model persistence and expanded features.
 */

const AIModel = {
    model: null,
    isTraining: false,
    isTrained: false,
    lastDataHash: null,

    // Storage keys
    WEIGHTS_KEY: 'vena_ml_weights',
    HASH_KEY: 'vena_ml_hash',

    async init() {
        // Define an enhanced model with more features
        this.model = tf.sequential();
        // Expanded inputs: [Sleep, Stress, DaysSinceLast, LastRPE, FatigueFactor, TrendFactor]
        this.model.add(tf.layers.dense({
            units: 8,
            inputShape: [6],
            activation: 'relu'
        }));
        this.model.add(tf.layers.dense({ units: 1 }));

        // Compile with adam optimizer for better convergence
        this.model.compile({
            loss: 'meanSquaredError',
            optimizer: tf.train.adam(0.01)
        });

        // Try to load saved weights
        const loaded = await this.loadWeights();
        if (loaded) {
            console.log("Vena-AI: Loaded saved model weights from localStorage");
            this.isTrained = true;
        } else {
            console.log("Vena-AI TensorFlow Model Initialized (no saved weights)");
        }
    },

    /**
     * Save model weights to localStorage
     */
    async saveWeights() {
        if (!this.model) return false;

        try {
            // Get weights from all layers
            const weights = [];
            for (const layer of this.model.layers) {
                const layerWeights = layer.getWeights();
                for (const w of layerWeights) {
                    weights.push({
                        shape: w.shape,
                        data: Array.from(w.dataSync())
                    });
                }
            }

            localStorage.setItem(this.WEIGHTS_KEY, JSON.stringify(weights));
            localStorage.setItem(this.HASH_KEY, this.lastDataHash || '');
            console.log("Vena-AI: Model weights saved to localStorage");
            return true;
        } catch (e) {
            console.error("Failed to save model weights:", e);
            return false;
        }
    },

    /**
     * Load model weights from localStorage
     */
    async loadWeights() {
        try {
            const saved = localStorage.getItem(this.WEIGHTS_KEY);
            const savedHash = localStorage.getItem(this.HASH_KEY);

            if (!saved) return false;

            const weightsData = JSON.parse(saved);
            const tensors = weightsData.map(w => tf.tensor(w.data, w.shape));

            let tensorIndex = 0;
            for (const layer of this.model.layers) {
                const numWeights = layer.getWeights().length;
                const layerTensors = tensors.slice(tensorIndex, tensorIndex + numWeights);
                layer.setWeights(layerTensors);
                tensorIndex += numWeights;
            }

            this.lastDataHash = savedHash;

            // Dispose tensors
            tensors.forEach(t => t.dispose());

            return true;
        } catch (e) {
            console.error("Failed to load model weights:", e);
            return false;
        }
    },

    /**
     * Generate a simple hash of the training data to detect changes
     */
    hashData(history) {
        const str = history.map(s => `${s.date}:${s.heavySingle}`).join('|');
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
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

        // Check if data has changed since last training
        const currentHash = this.hashData(history);
        if (this.isTrained && currentHash === this.lastDataHash) {
            console.log("Vena-AI: Data unchanged, skipping retraining.");
            return;
        }

        this.isTraining = true;
        console.log("Vena-AI: Training model with expanded features...");

        // Prepare training data
        // X: [Sleep, Stress, DaysSinceLast, LastRPE, FatigueFactor, TrendFactor]
        // Y: [Weight / 1000]

        const xs = [];
        const ys = [];

        // Sort history by date
        const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate rolling averages for fatigue
        const calculateFatigue = (index) => {
            const window = sortedHistory.slice(Math.max(0, index - 5), index);
            if (window.length === 0) return 0.5;
            const avgRpe = window.reduce((sum, s) => sum + (s.heavyRpe || 8), 0) / window.length;
            return Math.min(1, (avgRpe - 6) / 4); // Normalize RPE 6-10 to 0-1
        };

        // Calculate trend factor (performance direction)
        const calculateTrend = (index, liftType) => {
            const recent = sortedHistory.slice(Math.max(0, index - 3), index)
                .filter(s => s.type && s.type.includes(liftType) && s.heavySingle > 0);
            if (recent.length < 2) return 0.5; // Neutral
            const first = recent[0].heavySingle;
            const last = recent[recent.length - 1].heavySingle;
            const trend = (last - first) / first;
            return Math.max(0, Math.min(1, 0.5 + trend * 2)); // -25% to +25% mapped to 0-1
        };

        for (let i = 1; i < sortedHistory.length; i++) {
            const current = sortedHistory[i];
            const prev = sortedHistory[i - 1];

            // Calculate days diff
            const diffTime = Math.abs(new Date(current.date) - new Date(prev.date));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Only train on heavy sessions
            if (current.type && current.type.includes('heavy') && current.heavySingle > 0) {
                const sleepValue = current.metrics?.sleep || current.sleep || 3;
                const stressValue = current.metrics?.stress || current.stress || 3;

                // Normalize all inputs to 0-1
                const normSleep = sleepValue / 5;
                const normStress = (6 - stressValue) / 5; // Invert stress
                const normDays = Math.min(diffDays, 14) / 14;
                const normRpe = (prev.heavyRpe || 8) / 10;
                const fatigue = calculateFatigue(i);
                const trend = calculateTrend(i, current.type.includes('squat') ? 'squat' : 'bench');

                xs.push([normSleep, normStress, normDays, normRpe, fatigue, trend]);
                ys.push([current.heavySingle / 1000]);
            }
        }

        if (xs.length > 0) {
            const xTensor = tf.tensor2d(xs);
            const yTensor = tf.tensor2d(ys);

            await this.model.fit(xTensor, yTensor, {
                epochs: 100,
                batchSize: Math.min(xs.length, 16),
                shuffle: true,
                verbose: 0
            });

            xTensor.dispose();
            yTensor.dispose();

            this.isTrained = true;
            this.lastDataHash = currentHash;

            // Save weights to localStorage
            await this.saveWeights();

            console.log(`Vena-AI: Training complete with ${xs.length} samples. Weights saved.`);
        }

        this.isTraining = false;
    },

    /**
     * Predict target daily max
     * @param {Object} inputs - Extended inputs for 6-feature model
     * @returns {number} Predicted Weight (or null if model not trained)
     */
    predict(inputs) {
        // Return null if model doesn't exist or hasn't been trained yet
        if (!this.model || !this.isTrained) return null;

        // Normalize all 6 inputs
        const normSleep = (inputs.sleep || 3) / 5;
        const normStress = (6 - (inputs.stress || 3)) / 5;
        const normDays = Math.min(inputs.daysSinceLast || 7, 14) / 14;
        const normRpe = (inputs.lastRpe || 8) / 10;
        const fatigue = (inputs.fatigue || 50) / 100;
        const trend = (inputs.trend || 50) / 100;

        const inputTensor = tf.tensor2d([[normSleep, normStress, normDays, normRpe, fatigue, trend]]);
        const predictionTensor = this.model.predict(inputTensor);
        const predictionValue = predictionTensor.dataSync()[0];

        inputTensor.dispose();
        predictionTensor.dispose();

        // Scale back up
        let predictedWeight = predictionValue * 1000;

        // Clamp to reasonable range (200-800 lbs)
        predictedWeight = Math.max(200, Math.min(800, predictedWeight));

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