# 6. Showcase — Investigate a Binary with REA (Worked Example)

[REA — Reverse Engineer Anything](https://github.com/morluto/rea) is an open-source MCP server + CLI that connects an AI coding agent (or your terminal) to real RE tooling: native analysis through your Ghidra/IDA/Hopper install, plus JavaScript/Electron, .NET, APK, firmware, WASM and capture analyzers. Analysis runs locally; every finding ships with its evidence and stated limitations. This note walks a complete session.

> **Asked as:** "Show me how you'd use an AI agent in a reversing workflow without trusting it blindly."

---

## Setup (once)

```bash
npx rea-agents setup     # registers REA with your agent + installs workflow instructions
```

Setup detects your native provider (Hopper, Ghidra or IDA — Ghidra also covers 16-bit DOS targets) and wires the MCP tools (`open_binary`, `list_procedures`, `analyze_function`, …). The same workflows are available as CLI commands, which is what we'll use below so every step is reproducible.

---

## Worked example: "what does this binary do?"

**Target:** any unknown ELF/PE from your lab (use your own builds or crackmes — never hostile samples outside isolation).

**Step 1 — Inventory.** Ask what the binary contains before reading any code:

```bash
rea inspect ./program --provider ghidra --json | jq '.procedures | length'
rea search ./program entry --kind procedures --provider ghidra --json
```

You get a procedure inventory — names, addresses, imports. Pick exact names from this output for every later command; never guess symbol names.

**Step 2 — Read one function three ways.** For a suspicious procedure (say `validate_key`):

```bash
rea function ./program validate_key --provider ghidra --json   # dossier: signature, callers, callees
rea instructions ./program validate_key --provider ghidra --json
rea decompile ./program validate_key --provider ghidra --json  # pseudocode
```

**Step 3 — Follow references.** A string or import is a lead; cross-references close the loop:

```bash
rea xrefs ./program --address=0x401230 --provider ghidra --json
```

**Step 4 — Shortcut the special cases.** Go and Rust binaries carry their own metadata — no disassembler round-trip needed:

```bash
rea inspect-go-binary ./program --json    # compiler version, modules, build settings
rea inspect-rust-binary ./program --json  # crates, versions, dependency edges
```

**Step 5 — Let the agent do the legwork, then verify.** With MCP wired, the agentic version is: *"trace how user input reaches the network call in ./program and show the evidence."* REA returns functions, references, and unknowns; the agent explains and can even reimplement the behavior. Your job: verify each load-bearing claim — open the cited address in Ghidra, set the breakpoint, or reimplement the crypto yourself (see [Lab 4](/topics/reverse-engineering/deep/real-world-projects)).

---

## Evidence discipline (the part interviews love)

REA's contract is *findings + evidence + limitations*: every conclusion names the bytes, offsets, or traces behind it and what the provider could **not** establish (stripped symbols, indirect calls, packed regions). Adopt that discipline for your own reports: claim → address → verification method. "The agent said so" is never the verification method.

---

## Key takeaway

REA turns agentic RE from chat into procedure: inventory → read → xref → verify, with CLI commands you can re-run and evidence you can cite. Use it as the fast first pass in [Lab 5](/topics/reverse-engineering/deep/real-world-projects) — then prove everything yourself.
