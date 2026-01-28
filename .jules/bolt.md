# Bolt's Journal - Critical Learnings

## 2024-05-22 - [POSView Optimization]
**Learning:** High-frequency render components like POSView (which re-renders on every cart change) significantly benefit from memoizing derived data (categories, totals) and using individual Zustand selectors. Hoisting static JSX-returning helpers like `getItemIcon` outside the component prevents redundant re-creation and can slightly improve render performance.
**Action:** Always check for aggregate calculations in render loops and ensure they are memoized based on their minimum necessary dependencies. Use individual selectors for large stores to minimize re-render blast radius.
