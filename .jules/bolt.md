# Bolt's Journal - Critical Learnings

## 2025-05-15 - Optimizing high-frequency POS View
**Learning:** Destructuring the entire Zustand store causes unnecessary re-renders when unrelated state changes. In high-frequency components like POS, individual selectors are critical.
**Action:** Always use individual selectors for Zustand state to isolate re-renders.
