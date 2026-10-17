# 4. Static Analysis with Ghidra

Ghidra (NSA, free) turns bytes into readable pseudo-C. The skill isn't clicking — it's a **workflow**: orient → name → understand → verify.

> **Asked as:** "How do you approach a stripped 2 MB binary in Ghidra?"

---

## The workflow

1. **Auto-analyze, then orient.** Open CodeBrowser: Symbol Tree → Imports (capabilities), Exports, Strings window (sort by type — URLs, registry keys, errors).
2. **Find `main`.** Entry point → runtime init → usually the 1st/3rd argument call is `main`. Rename it. Everything flows from here.
3. **Follow interesting strings.** Cross-reference (right-click → References) an error message or URL: *who prints it, under what condition?* That condition is the logic you want.
4. **Rename as you learn.** `FUN_00401230` → `check_license`, `local_28` → `bytes_read`, `DAT_` → `config_blob`. Future-you (and interviewers) can follow the story.
5. **Fix the decompiler.** Wrong signatures produce garbage: right-click → Edit Function Signature, set parameter types, mark `noreturn` (exit/abort) so dead code folds away.
6. **Verify dynamically.** Static hypotheses ("this decrypts the config") get confirmed with a breakpoint or a reimplementation script.

---

## Views and shortcuts worth memorizing

| Action | Where |
|---|---|
| Cross-references to symbol | Right-click → References, or `Ctrl+Shift+F` |
| Decompiler ↔ disassembly sync | Click a line — both panes highlight |
| Function graph (CFG) | Window → Function Graph |
| Patch bytes / nop a check | Right-click → Patch Instruction (in a *copy*) |
| Search memory/bytes | Search → Memory (hex, regex, strings) |
| Version tracking | For diffing two builds (patch analysis) |

---

## Ghidra scripting (Python)

Real engagements need automation — rename 200 functions, dump every XOR blob, extract configs:

```python
# List all functions calling CreateFileW
for ref in getReferencesTo(getSymbol('CreateFileW').getAddress()):
    print(ref.getFromAddress(), getFunctionContaining(ref.getFromAddress()))
```

Headless mode (`analyzeHeadless`) runs the same scripts in CI/batch triage pipelines. IDA users: the concepts transfer 1:1 (xrefs, renaming, IDAPython); Binary Ninja's MLIL is arguably the cleanest IL for dataflow reasoning. Learn one deeply, skim the others.

## AI-assisted reversing with REA

Agentic workflows are becoming a standard first pass: [REA — Reverse Engineer Anything](https://github.com/morluto/rea) exposes RE capabilities (native binaries via your Ghidra/IDA/Hopper install, plus JavaScript/Electron, .NET, APKs, firmware, WASM and network captures) through MCP, so an AI coding agent can triage a target, trace relevant code, and return findings with evidence — or you can drive the same workflows from the terminal (`npx rea-agents setup`). Analysis runs locally. Treat agent output like an intern's notes: fast orientation, but verify every load-bearing claim with your own breakpoint or trace. Full worked example: [Showcase — Investigate a Binary with REA](./06-agentic-reversing-showcase-rea.md).

---

## When static analysis lies

- **Packing/encryption** — you're reading the stub, not the payload. Unpack first.
- **Indirect calls** (`call rax`) and vtables — targets resolve at runtime; use dataflow + dynamic runs.
- **Obfuscation** — control-flow flattening, opaque predicates, string encryption. Simplify with emulation (Unicorn) or trace-and-diff.
- **Tail calls and inlining** — the "function" you see may be three merged ones. Trust behavior, not boundaries.

---

## Key takeaway

Ghidra rewards method: imports and strings for orientation, xrefs for navigation, renaming for comprehension, scripting for scale. The decompiler proposes — you dispose, by verifying against runtime truth.
