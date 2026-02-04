## 2025-05-14 - [Optimize POSView performance with selectors and memoization]
**Learning:** In Zustand, subscribing to the entire store via destructuring causes unnecessary re-renders whenever any unrelated part of the store updates. Using individual selectors is a simple but high-impact optimization.
**Action:** Always use granular selectors for Zustand stores and memoize derived data like filtered lists or aggregations to keep the UI responsive.
