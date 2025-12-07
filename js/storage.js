/**
 * Vena-AI Storage Module
 * Manages localStorage operations with structure validation and export/import capabilities.
 */

// Polyfill for crypto.randomUUID for older browsers (e.g., iOS < 15.4)
if (!crypto.randomUUID) {
    crypto.randomUUID = function() {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    };
}

const Storage = {
    KEYS: {
        CONFIG: 'vena_config',
        HISTORY_PREFIX: 'vena_history_'
    },

    DEFAULTS: {
        CONFIG: {
            currentUser: "Anthony",
            users: ["Anthony", "Seth"],
            theme: "dark",
            schedule: {
                "Tuesday": "heavy_squat",
                "Wednesday": "heavy_bench",
                "Saturday": "wave_squat",
                "Sunday": "wave_bench"
            },
            maxAxialCapacity: 15000,
            trainingMaxes: {
                squat: 500,
                bench: 315
            }
        }
    },

    // Initialize storage if empty
    init() {
        if (!localStorage.getItem(this.KEYS.CONFIG)) {
            this.saveConfig(this.DEFAULTS.CONFIG);
            console.log("Initialized Vena-AI Config with defaults.");
        }
    },

    // Config Management
    getConfig() {
        const config = localStorage.getItem(this.KEYS.CONFIG);
        return config ? JSON.parse(config) : this.DEFAULTS.CONFIG;
    },

    saveConfig(config) {
        localStorage.setItem(this.KEYS.CONFIG, JSON.stringify(config));
    },

    updateConfig(key, value) {
        const config = this.getConfig();
        config[key] = value;
        this.saveConfig(config);
    },

    // History Management
    getHistory(user) {
        const key = `${this.KEYS.HISTORY_PREFIX}${user}`;
        const history = localStorage.getItem(key);
        return history ? JSON.parse(history) : [];
    },

    addSession(user, sessionData) {
        const history = this.getHistory(user);
        // Ensure ID is unique
        sessionData.id = sessionData.id || crypto.randomUUID();
        history.push(sessionData);
        
        const key = `${this.KEYS.HISTORY_PREFIX}${user}`;
        localStorage.setItem(key, JSON.stringify(history));
        return sessionData;
    },

    getLastSession(user, type = null) {
        const history = this.getHistory(user);
        if (history.length === 0) return null;

        if (type) {
            // Filter by type and sort by date descending
            const filtered = history.filter(s => s.type === type);
            return filtered.length > 0 ? filtered[filtered.length - 1] : null;
        }
        
        return history[history.length - 1];
    },

    // Import/Export
    exportData() {
        const data = {
            config: this.getConfig(),
            histories: {}
        };
        
        data.config.users.forEach(user => {
            data.histories[user] = this.getHistory(user);
        });

        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `vena_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    importData(jsonContent) {
        try {
            const data = JSON.parse(jsonContent);
            if (data.config) {
                this.saveConfig(data.config);
            }
            if (data.histories) {
                Object.keys(data.histories).forEach(user => {
                    const key = `${this.KEYS.HISTORY_PREFIX}${user}`;
                    localStorage.setItem(key, JSON.stringify(data.histories[user]));
                });
            }
            return true;
        } catch (e) {
            console.error("Import failed:", e);
            return false;
        }
    }
};

// Auto-initialize on load
Storage.init();