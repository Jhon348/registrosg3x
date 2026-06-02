---
name: React 19 insertBefore crash fix
description: How to prevent insertBefore DOM errors in animated React 19 concurrent-mode components
---

React 19 concurrent mode crashes with `insertBefore` when a list rendered inside an animation loop changes length between frames.

**The rule:** Any component that re-renders on every animation tick (requestAnimationFrame, setInterval) must render a **fixed-size array with stable integer keys** — never a variable-length array with value-based keys.

**Why:** When value-based keys change (e.g. tick labels scrolling), React removes the old node and inserts a new one. If a second concurrent update is in flight at the same moment, the reference node is already detached and insertBefore throws.

**How to apply in VTape/scrolling tapes:**
```tsx
const NUM_TICKS = 24; // fixed constant
Array.from({ length: NUM_TICKS }, (_, i) => {
  const v = base + (i - half) * step;
  return <div key={i} style={{ opacity: inRange ? 1 : 0 }}>{v}</div>;
})
```
Keys are always 0..23. Content changes, DOM structure never does.

**Secondary fixes applied to same component:**
- VSIBar: replaced `{up && <div/>}` conditional with always-rendered divs using `height: up ? barH : 0`
- activeCAS list: use `key={message}` not `key={index}` so item removal doesn't reorder sibling nodes
- VTape: replaced `return null` in map with `opacity: 0` (null changes child count, triggering the same crash)
