# Powerlifting Planner v7 - Analysis & Recommendations

**Date:** December 4, 2025
**Target:** `planner_v7.html` (HTML/JS Single Page App)

## 1. Logic Analysis: Fatigue Management
The current "v7" logic utilizes a **Linear Wave Progression** for volume (3x4 $\rightarrow$ 3x5 $\rightarrow$ 3x6 $\rightarrow$ Reset) and a **Reactive Auto-Regulation** model for heavy singles (RPE-based adjustments).

### Strengths
*   **Reactive Safeguards:** The `runSystemAutopilot` function effectively monitors the last 5 sessions for failure/overshooting flags. The "Pivot" override (Red State) is a strong safety mechanism.
*   **Step Loading:** The 3x4-6 wave allows for volume accumulation before intensity increases, which is solid for hypertrophy and capacity building.

### Weaknesses
*   **Purely Reactive:** The system only triggers a "Pivot" *after* failures have occurred. It lacks **proactive** fatigue management (detecting accumulated fatigue before performance drops).
*   **Binary Success/Fail:** The progression logic (`calculateWaveTarget`) is somewhat rigid. If a user gets 3x6 but it was RPE 10 (grinders), the system promotes them to +5lbs. This ignores "quality" on volume work.
*   **Missing Volume Metrics:** There is no tracking of "Tonnage" (Sets x Reps x Weight) to monitor Acute vs. Chronic workload.

### Recommended Logic Improvements
1.  **Proactive Readiness Check:** Introduce a simple 1-5 "Daily Readiness" (Sleep/Stress) slider *before* the workout starts. If Readiness is $<3$, automatically suggest a conservative single (RPE 7 target) rather than the standard RPE 8.
2.  **Volume Quality Gate:** Modify the Wave Progression to only advance if the Volume RPE was $<9$. If the user hits 3x6 @ RPE 9.5, they should repeat the weight, not increase it.
3.  **Weekly Volume Load Tracking:** Calculate the total tonnage per week. If the acute load (this week) exceeds the chronic load (avg last 4 weeks) by $>15\%$, warn the user of potential injury risk.

## 2. UI/UX Analysis
The interface is functional and utilitarian ("Dark Mode" engineering style), but can be refined for better mobile usability.

### Areas for Improvement
*   **Data Visualization:** The current SVG polyline graph is very basic. It lacks tooltips, axes labels, and volume correlation.
*   **Mobile Targets:** Some inputs and buttons (especially the "Quality" dropdowns) may be small on mobile devices.
*   **Visual Hierarchy:** The "Session Log" card is dense. It exposes Heavy and Volume inputs simultaneously (though hidden via JS), making the DOM heavy.

### Recommended UI/UX Improvements
1.  **Chart.js Integration:** Replace the manual SVG drawing with `Chart.js` (via CDN or local file). This allows for dual-axis charts (e.g., Strength Progression on Left Axis, Volume Tonnage on Right Axis bars).
2.  **Wizard-Style Logging:** Instead of one long form, break the logging process into steps: `Readiness Check` $\rightarrow$ `Heavy Single` $\rightarrow$ `Backdowns` $\rightarrow$ `Volume Work`. This reduces cognitive load during training.
3.  **Result Highlighting:** Use more distinct color coding for "Next Targets" so the user sees their goal immediately upon opening the app.

## 3. "Free AI" Integration Strategy
The user requested "Free AI" to act as a coach. True LLMs (like GPT-4) cost money per API call. Local LLMs (WebLLM) are too heavy (gigabytes to download) for a simple web tool.

### Recommendation: Hybrid Expert System + Prompt Generator

**Component A: Enhanced Rule-Based Expert System (Local "AI")**
Expand the current `if/else` logic in `generateHeavySuggestion` to behave more like a coach.
*   *Implementation:* hard-code "coaching rules" (e.g., Prilepin’s Chart).
*   *Example:* If the user fails backdowns 2 weeks in a row, the system suggests: *"I've noticed a pattern of fatigue. Let's switch to a 2-week Deload block."* This is free, instant, and runs locally.

**Component B: The "Consult a Coach" Button (Prompt Engineering)**
Since the user likely has access to ChatGPT (Free Tier), we can bridge the gap.
*   *Feature:* Add a button: **"Generate Coach Report"**.
*   *Function:* This button compiles the last 4 weeks of JSON history into a structured text prompt.
*   *User Action:* The user copies this text and pastes it into ChatGPT.
*   *Prompt Template:* *"Act as a Powerlifting Coach. Here is my training log for the last month in JSON format: [DATA]. Analyze my RPE trends and suggest if I should increase volume or intensity next block."*

## Summary of Next Steps
1.  **Refine Logic:** Add "Readiness" slider and Volume Quality Gates.
2.  **Upgrade UI:** Switch to Chart.js and "Wizard" input flow.
3.  **Implement "AI":** Build the "Generate Coach Report" clipboard feature.