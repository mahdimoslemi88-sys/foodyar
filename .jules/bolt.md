## 2025-05-22 - Performance Optimization Sweep

**Learning:** Component re-renders and O(N) lookups in loops are the primary bottlenecks in high-frequency data applications like POS systems. Using `useMemo` for derived state and pre-indexing arrays into `Map` objects significantly reduces computation overhead.

**Action:** Always check for `.find()` calls inside loops in domain logic and look for unmemoized calculations in high-frequency React components.
