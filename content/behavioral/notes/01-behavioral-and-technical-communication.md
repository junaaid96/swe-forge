# Behavioral Interviews & Technical Communication

Strong engineers get rejected for weak communication more often than for weak algorithms. This guide covers the STAR method, a story bank for the questions you will certainly be asked, and the communication habits that make technical rounds go well.

---

## 1. The STAR method

| Step | Say | Share of the answer |
|---|---|---|
| **Situation** | context: team, product, constraints, why it mattered | ~15% |
| **Task** | *your* responsibility or goal | ~10% |
| **Action** | the specific steps **you** took and why ("I", not "we"); trade-offs considered | ~55% |
| **Result** | measurable outcome (latency −40%, incidents halved, shipped 2 weeks early) and what you learned | ~20% |

Keep answers to about two minutes, then let the interviewer dig in. Have numbers ready, and end with the lesson or what you would do differently.

> **Asked as:** "Tell me about a time when…" (every behavioral question is STAR-shaped)

## 2. Build a story bank

Prepare 6–8 stories that can each answer several questions:

| Prompt | What they're testing | Story angle |
|---|---|---|
| A challenging bug | debugging method, persistence | hypothesis → instrument → isolate → fix → prevent recurrence |
| Disagreement with a teammate or manager | collaboration, ego | understood their view, used data, disagreed and committed or found a third option |
| A project you're proud of | technical depth, ownership | the hardest design decision and its trade-offs |
| A failure or mistake | self-awareness, growth | own it plainly, the fix, the process change afterwards |
| Tight deadline | prioritisation | what you cut, how you communicated risk |
| Leading without authority | influence | RFC, prototype, mentoring, getting buy-in |
| Ambiguous requirements | product sense | questions you asked, how you de-risked with a small slice |
| Giving or receiving feedback | maturity | specific, kind, actionable; what changed |

Also prepare: "Why this company?", "Why are you leaving?", "Tell me about yourself" (a 60–90 second present → past → future pitch), and two or three thoughtful questions for them.

---

## 3. Explaining technical concepts

- **Know your audience:** adjust depth; use an analogy for non-specialists, then add precision.
- **Start high-level:** "First the overall approach, then the details." Give the map before the territory.
- **Draw:** boxes and arrows for architecture, a small table for state, a timeline for concurrency.
- **Define acronyms** the first time: "CQRS, Command Query Responsibility Segregation, means…"
- **Explain internals simply:** "React keeps a virtual tree. When state changes it diffs the new tree against the old one and updates only the DOM nodes that changed."

## 4. Clarifying questions

| Category | Examples |
|---|---|
| Requirements | "What's the expected scale?" · "Are there latency requirements?" · "Who are the users?" |
| Constraints | "Can I use external libraries?" · "What's the input format and size?" · "Memory limits?" |
| Edge cases | "How should duplicates be handled?" · "What if the input is empty?" · "Can values be negative?" |
| Trade-offs | "Should I optimise for time or space?" · "Is eventual consistency acceptable?" |

Asking two or three good questions signals seniority; asking none signals you'll build the wrong thing.

## 5. Problem-solving out loud

- **Narrate:** "I'm thinking a hash map, because I need to look up complements in O(1)."
- **State assumptions:** "I'll assume the array isn't sorted."
- **Compare options:** "This is O(n) time and O(n) space; alternatively sorting gives O(1) extra space at O(n log n)."
- **Invite feedback:** "Does this direction make sense before I code it?"

## 6. Handling uncertainty and stress

- **Admit when stuck:** "I'm not seeing the optimal solution yet. Let me try a brute force first and look for repeated work."
- **Work an example:** small concrete inputs often reveal the pattern.
- **Ask for a hint** after a few minutes without progress; using a hint well is a positive signal.
- **Stay composed:** pausing to think is fine. It's a conversation, not an exam.

---

## 7. Mock interview habits

**Before:** practise on LeetCode/HackerRank/CodeSignal (company-tagged sets), do mock interviews with peers or Pramp/interviewing.io, and review fundamentals. Use Forgeline's timed **Mock interview** mode to rehearse explaining answers aloud.

**During (coding round):** clarify ~5 min · approach ~5 min · code ~25 min · test ~10 min. Write clean code with meaningful names and helper functions; test with your example and edge cases before declaring victory.

**After solving:** state complexity and justify it, propose optimisations ("can we do better?"), and discuss extensions ("what if the data doesn't fit in memory?") to show broader thinking.

## 8. Red flags to avoid

Blaming others · "we" with no "I" · no measurable result · rambling past three minutes · criticising a previous employer · pretending to know something you don't (say "I haven't used X, but here's how I'd reason about it").
