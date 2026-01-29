## 2025-05-24 - [Zustand Re-render Optimization]
**Learning:** Destructuring the entire state from a Zustand store (e.g., `const { a, b } = useStore()`) causes the component to re-render on *any* state change in that store. In large stores with frequent updates (like `auditLogs`), this leads to significant performance degradation in high-traffic components.
**Action:** Always use selective selectors (e.g., `const a = useStore(state => state.a)`) to ensure components only re-render when the specific data they consume changes.

## 2025-05-24 - [Tool Limitation: read_file Truncation]
**Learning:** The `read_file` tool may truncate output at around 1000 characters.
**Action:** Use `run_in_bash_session` with `sed` or `cat` to read larger files in segments to ensure full context of the code being optimized.
