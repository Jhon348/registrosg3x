---
name: React 19 insertBefore crash fix
description: How to prevent insertBefore DOM errors in animated React 19 concurrent-mode components
---

React 19 concurrent mode crashes with `insertBefore` when animation state updates from `setInterval` interleave with each other. There are two root causes and both must be fixed.

## Root cause 1 — variable-length DOM lists during animation

**The rule:** Any component that re-renders on every animation tick must render a **fixed-size array with stable integer keys** — never a variable-length array with value-based keys.

**Why:** When value-based keys change, React removes old nodes and inserts new ones. If a second concurrent update is in flight, the reference node is already detached and insertBefore throws.

## Root cause 2 — `setInterval` racing with React's concurrent scheduler (THE DEFINITIVE FIX)

Even with all DOM structure fixed, `setInterval` fires outside React's scheduler. Each tick calls `setState`, which React 19 treats as a concurrent update. If the previous tick's render hasn't committed yet, two renders interleave → insertBefore.

**The fix: `flushSync`**

```tsx
import { flushSync } from "react-dom";

useEffect(() => {
  if (!isPlaying) return;
  const id = setInterval(() => {
    flushSync(() => {          // forces synchronous commit before next tick
      setIndex(i => i + 1);
    });
  }, 100);
  return () => clearInterval(id);
}, [isPlaying]);
```

`flushSync` forces React to commit synchronously. The next `setInterval` tick cannot start a new render while the previous one is still committing.

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
