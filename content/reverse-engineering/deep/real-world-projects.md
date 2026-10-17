---
id: reverse-engineering-deep-real-world-projects
track: real-world-projects
---

# Reverse Engineering — Deep: Real-World Projects

> Four guided labs, easiest first. Do them in order — each teaches one transferable move. All use legal targets: crackmes, open tools, and your own builds.

---

## Lab 1 — Crackme: find the password check (static only)

**Target:** any beginner crackme (crackmes.one, "Very Easy"). **Goal:** recover the expected input without running it.

1. Strings: look for `Correct!` / `Wrong!` and the comparison nearby.
2. Xref the failure string: the branch above it is the check. Read the comparison — `strcmp`, length check, or char-by-char loop?
3. If the expected value is plaintext in `.rodata`, done. If it's computed (XOR, arithmetic), reimplement the computation in Python and print the answer.
4. **Move learned:** failure-anchored reversing — start from the observable outcome and walk backwards.

## Lab 2 — UPX: unpack and re-analyze

**Target:** `upx --ultra-brute` a small program you compiled yourself. **Goal:** recover imports and strings.

1. Confirm packing: sections `UPX0`/`UPX1`, one import, high entropy (Detect It Easy agrees).
2. Easy path: `upx -d packed.exe -o unpacked.exe`. Diff imports/strings before/after.
3. Hard path (simulate modified UPX): break at entry in x64dbg, step until the jump to OEP (tall `popa` + far jump is the classic tail), dump with Scylla, rebuild imports.
4. **Move learned:** OEP-hunting and dump discipline — never analyze the stub as if it were the program.

## Lab 3 — PyInstaller binary: from EXE back to Python

**Target:** a PyInstaller-frozen script of your own. **Goal:** recover readable source.

1. Confirm: strings show `pyinstaller`, `_MEI` paths, embedded `.pyc` names.
2. Extract with `pyinstxtractor`: out comes the bytecode archive.
3. Decompile `.pyc` with `pycdc`/`uncompyle6` (match the Python version!) or read disassembly with `dis`.
4. **Move learned:** bundled-runtime analysis — most "mystery EXEs" from incident response are Python/Go/.NET wrappers, each with its own unpack-then-decompile pipeline. (Go: `goreconstruct`/Ghidra Go lifter; .NET: dnSpy/ILSpy.)

## Lab 4 — Config extraction: XOR blob to C2 URL

**Target:** write a 30-line C program that XOR-decodes a URL with a 4-byte key and prints it. Compile, strip, then pretend it's hostile.

1. In Ghidra find the decode loop (characteristic `xor` over a buffer with a repeating key).
2. Note blob address, length, key bytes.
3. Write a 10-line Python script reimplementing the loop; verify output equals the original URL.
4. Bonus: do it as a Ghidra script operating on the program's memory, and as a Unicorn emulation.
5. **Move learned:** the malware-config pipeline — locate crypto, extract parameters, reimplement offline, publish IOCs.

---

## Lab 5 — Agentic first pass with REA

**Target:** any binary from Labs 1–4. **Goal:** compare an agent's triage against your own.

1. Install [REA](https://github.com/morluto/rea) (`npx rea-agents setup`) with your Ghidra/IDA/Hopper as the native provider — see the [worked-example showcase](./06-agentic-reversing-showcase-rea.md) for the full command flow.
2. Ask your agent to identify the binary's capabilities and point to the password check / decode loop / C2 logic.
3. Verify each claim yourself: does the cited address hold the cited behavior? Note what the agent got right, what it hedged, and what it invented.
4. **Move learned:** supervised agentic RE — where agents save time (orientation, boilerplate) and where they can't be trusted (exact offsets, crypto details).

## Key takeaway

Four moves cover most engagements: anchor on observables, unpack before analyzing, recognize bundled runtimes, and reimplement small crypto offline — with agentic tools like REA as a supervised accelerant. Practice them on legal targets until each takes minutes, not hours.
