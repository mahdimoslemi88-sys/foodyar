## 2026-01-30 - [Zustand Store Access Optimization]
**Learning:** Destructuring the entire Zustand store object (e.g., const { a, b } = useStore()) causes components to re-render on *any* store change. Using individual selectors (e.g., const a = useStore(state => state.a)) limits re-renders to only when the specific data slice changes.
**Action:** Always use granular selectors for Zustand stores, especially in high-frequency render components like POSView.
