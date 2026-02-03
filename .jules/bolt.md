# Bolt's Journal - Critical Learnings

## 2025-05-15 - [Zustand Selector Optimization & Component Memoization in POSView]
**Learning:** Using whole-store destructuring in high-frequency components like POSView causes unnecessary re-renders whenever any unrelated part of the store (e.g., audit logs or sales) updates. Combined with un-memoized grid items, this leads to significant UI lag during rapid interactions.
**Action:** Always use individual Zustand selectors for specific state slices and wrap grid items in `React.memo` with `useCallback` for event handlers to isolate render impacts.
