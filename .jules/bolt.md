## 2024-05-23 - [POSView Optimization]
**Learning:** Destructuring the entire Zustand store in a large component like `POSView` causes re-renders on every store update, even for unrelated data like `auditLogs`. Extracting list items into memoized components is crucial for performance when dealing with many items.
**Action:** Always use individual selectors for Zustand and wrap list items in `React.memo`.
