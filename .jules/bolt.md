## 2025-01-31 - POSView Performance Bottlenecks
**Learning:** Found several performance anti-patterns in `POSView.tsx`:
1. Destructuring from the whole store causes re-renders on unrelated state changes.
2. Expensive calculations (like categories list and cart totals) are performed on every render instead of being memoized.
3. Nested grid of items causes large virtual DOM reconciliation on every cart update (adding/removing items).
4. Utility functions like `getItemIcon` are defined inside the component, leading to unnecessary re-creations.
**Action:** Apply memoization (useMemo, React.memo), hoist utilities, and use specific selectors for the store.
