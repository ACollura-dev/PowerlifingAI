# Vena-AI: Powerlifting PWA Specification

## 1. Overview
"Vena-AI" is a Progressive Web Application (PWA) designed to optimize powerlifting programming through client-side AI and logic gates. It evolves the previous "Collura/Seth Planner" into a smart, adaptive system that monitors fatigue, detects "sandbagging," and manages axial loading, specifically tailored for a 4-day split (Tue/Wed/Sat/Sun).

## 2. Technical Stack
*   **Core**: HTML5, CSS3 (Modern/Dark Theme), Vanilla JavaScript (ES6+).
*   **AI/ML**: `TensorFlow.js` (via CDN) for client-side regression models.
*   **Visualization**: `Chart.js` (via CDN) for progress tracking and fatigue heatmaps.
*   **Persistence**: `localStorage` (Structured JSON) with export/import capabilities.
*   **PWA**: `manifest.json` for installability and `service-worker.js` for offline caching.

## 3. Data Structures (JSON Schema)

### 3.1. User Configuration (`vena_config`)
```json
{
  "currentUser": "Anthony",
  "users": ["Anthony", "Seth"],
  "theme": "dark",
  "schedule": {
    "tuesday": "heavy_squat",
    "wednesday": "heavy_bench",
    "saturday": "wave_squat",
    "sunday": "wave_bench"
  },
  "maxAxialCapacity": 15000, // lbs (Weekly limit reference)
  "trainingMaxes": {
    "squat": 500,
    "bench": 315
  }
}
```

### 3.2. Session History (`vena_history_[user]`)
```json
[
  {
    "id": "uuid-v4",
    "date": "2023-10-27",
    "dayOfWeek": 2, // Tuesday
    "type": "heavy_squat",
    "metrics": {
      "bodyweight": 205,
      "sleepQuality": 4, // 1-5 scale
      "stressLevel": 2   // 1-5 scale
    },
    "performance": {
      "topSingle": 455,
      "topRPE": 8,
      "backdownVolume": 3500, // weight * reps * sets
      "axialLoad": 4550       // Estimated spinal load
    },
    "logicFlags": {
      "sandbaggingDetected": false,
      "fatigueTriggered": false,
      "pivotForced": false
    },
    "notes": "Felt strong, good speed."
  }
]
```

## 4. Algorithm Logic & Gates

### 4.1. e1RM Regression (TensorFlow.js)
Instead of static multipliers (e.g., `Weight * 1.03`), a linear regression model will be trained on the user's history to predict "Next Session Capacity".
*   **Inputs (X)**: [Last Heavy Single, Sleep Score, Days Since Last Session, Last RPE]
*   **Output (Y)**: Predicted 1RM for the day.
*   **Usage**: The app will suggest a "Daily Max" based on pre-session inputs (Sleep/Stress) before the user even touches the bar.

### 4.2. Logic Gates

#### Gate A: RPE-Correction ("Sandbagging Detector")
*   **Trigger**: If `Heavy Single RPE` <= 7.5 AND `Volume Success` = FALSE.
*   **Diagnosis**: The user claimed the weight was easy but failed the back-off work.
*   **Action**: Next session volume intensity increased by 2.5% (Force adaptation), or display warning: *"Focus Mismatch Detected"*.

#### Gate B: Fatigue-Intervention
*   **Trigger**: If `TopSingle` < `Previous TopSingle` for 2 consecutive "Heavy" sessions.
*   **Action**:
    1.  Activate **Pivot Mode** automatically.
    2.  Next week's loads reduced by 15%.
    3.  UI changes to "Recovery Theme" (Green/Blue accents).

#### Gate C: Axial Load Monitor
*   **Context**: "Heavy Squat" (Tuesday) places high spinal stress. "Wave Squat" (Saturday) requires recovery.
*   **Calculation**: `SessionAxialLoad = Sum(Weight * Reps)` for Squats.
*   **Trigger**: If Tuesday's Axial Load > `User.maxAxialCapacity` OR Tuesday RPE > 9.
*   **Action for Saturday**:
    *   Reduce Saturday's "Wave Target" weight by 5%.
    *   Or convert Saturday to "Pause Squats" (Technical variation) to reduce load while maintaining intensity.

## 5. UI/UX Design

### 5.1. View Structure
1.  **Dashboard (Home)**:
    *   **Header**: Date Picker (Default: Today) + User Switcher.
    *   **Smart Status**: "Ready to Train" (Green) or "High Fatigue Warning" (Red).
    *   **Today's Focus**: Auto-detected based on Day of Week (e.g., "Tuesday: Heavy Squat").
    *   **Override Button**: "Not doing Tuesday's workout? Change Plan."

2.  **Input Module**:
    *   **Pre-Flight**: Sliders for Sleep (1-5) and Stress (1-5). -> *Updates AI Prediction live.*
    *   **The Work**: Large input fields for Top Single and Back-downs.
    *   **Visual Feedback**: As you type 405, the app shows "4 Plates" visual.

3.  **Analysis Tab**:
    *   **Chart.js**: Line graph of e1RM over time.
    *   **Heatmap**: Grid showing consistency (Green squares for completed days).

### 5.2. Interaction Flow
1.  **Open App**: Checks Date (e.g., Tuesday). Loads "Heavy Squat" profile.
2.  **Check-in**: User inputs "Sleep: 3/5". Model predicts: "Target 465 today".
3.  **Execution**: User performs lift. Enters "465 @ RPE 8.5".
4.  **Logic Check**: System calculates back-off weights. Checks Axial Load.
5.  **Finish**: "Save Session". Updates History.
6.  **Review**: Shows "Saturday Target" based on today's fatigue.

## 6. File Structure
```text
/
├── index.html            # Main entry point (PWA container)
├── manifest.json         # PWA configuration
├── service-worker.js     # Offline caching logic
├── css/
│   └── styles.css        # Modern Dark Theme
├── js/
│   ├── app.js            # Main controller
│   ├── ai_model.js       # TensorFlow.js logic
│   ├── logic_gates.js    # The 3 specific logic gates
│   ├── storage.js        # LocalStorage wrapper
│   └── ui_renderer.js    # DOM manipulation
└── lib/
    ├── chart.js          # (Local or CDN)
    └── tf.js             # (Local or CDN)