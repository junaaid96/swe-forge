# UI/UX Essentials for Engineers

You don't need to be a designer to build interfaces people enjoy. This guide covers the principles behind usable UIs, the accessibility rules engineers are expected to know, layout and typography systems, and the performance and feedback patterns that make an app feel fast.

---

## 1. Usability heuristics (Nielsen's 10, condensed)

| Heuristic | In practice |
|---|---|
| Visibility of system status | loading indicators, saved/unsaved state, progress bars |
| Match the real world | user language, not internal jargon; familiar icons |
| User control and freedom | undo, cancel, back that works, easy exits from flows |
| Consistency and standards | same action, same look, same place; follow platform conventions |
| Error prevention | constrain inputs, confirm destructive actions, sensible defaults |
| Recognition over recall | visible options, recent items, autocomplete |
| Flexibility and efficiency | keyboard shortcuts, command palettes, bulk actions for power users |
| Aesthetic and minimalist design | remove what doesn't help the task |
| Help users recover from errors | plain-language messages that say what happened and how to fix it |
| Help and documentation | inline hints, empty states that teach |

## 2. Visual hierarchy and layout

- **Hierarchy:** size, weight, colour and spacing tell users what matters first. One primary action per view.
- **Spacing scale:** use a consistent scale (4/8 px multiples). Related items sit closer together (proximity, a Gestalt principle).
- **Grids:** 12-column grids or CSS Grid/Flexbox layouts; align to a few edges.
- **Typography:** 1–2 typefaces, a modular type scale, body text 16 px+, line length 60–80 characters, line height ~1.5 for body copy.
- **Colour:** a small palette with semantic roles (primary, success, warning, danger, neutral); never use colour as the only signal.
- **Responsive design:** mobile-first CSS, fluid units (`rem`, `%`, `clamp()`), breakpoints where the content breaks, touch targets ≥ 44×44 px.

---

## 3. Accessibility (WCAG 2.2 AA)

The **POUR** principles: Perceivable, Operable, Understandable, Robust.

| Rule | How |
|---|---|
| Semantic HTML first | `<button>` for actions, `<a>` for navigation, landmarks (`<header>`, `<nav>`, `<main>`), headings in order |
| Text alternatives | meaningful `alt` text; `alt=""` for decorative images |
| Colour contrast | ≥ 4.5:1 for body text, ≥ 3:1 for large text and UI components |
| Keyboard access | everything reachable with Tab, visible focus styles, no keyboard traps, a "skip to content" link |
| Forms | every input has a `<label>`; errors announced and linked with `aria-describedby` |
| ARIA | only when HTML can't express it ("no ARIA is better than bad ARIA"); `aria-live` for dynamic updates |
| Motion | respect `prefers-reduced-motion`; no flashing content |
| Focus management | move focus into dialogs and back on close; manage focus on route changes in SPAs |

Test with keyboard-only navigation, a screen reader (VoiceOver, NVDA), axe DevTools and Lighthouse.

> **Asked as:** "How do you make a custom dropdown accessible?" (use a native `<select>` if possible; otherwise follow the ARIA combobox/listbox pattern with arrow-key navigation, `aria-expanded`, `aria-activedescendant` and Escape to close)

## 4. Feedback, states and perceived performance

- Design **every state**: empty, loading, partial, error, success, offline.
- **Skeleton screens** feel faster than spinners for content loads; show spinners only for actions under a few seconds.
- **Optimistic UI:** update immediately and roll back on failure (likes, toggles).
- **Response-time thresholds:** ~100 ms feels instant, ~1 s keeps flow, ~10 s loses attention (show progress).
- **Core Web Vitals:** LCP < 2.5 s, INP < 200 ms, CLS < 0.1. Reserve space for images and ads to avoid layout shift.

## 5. Forms that convert

Single column, labels above fields, inline validation after blur (not on every keystroke), clear required/optional markers, correct input types (`type="email"`, `inputmode="numeric"`, `autocomplete` attributes), and preserve user input on errors.

## 6. Design systems

A design system = **tokens** (colour, spacing, typography, radius, shadow as variables) + **components** (buttons, inputs, dialogs) + **guidelines**. Examples: Material, Fluent, Carbon, shadcn/ui on Radix primitives. Benefits: consistency, accessibility baked in once, faster delivery. Document components in Storybook and guard them with visual regression tests.

## 7. Dark mode done right

Use semantic tokens (`--bg`, `--text`, `--surface`) rather than raw colours, honour `prefers-color-scheme` with a manual override saved in `localStorage`, avoid pure black backgrounds, desaturate bright accents, and set the theme before first paint to avoid a flash.
