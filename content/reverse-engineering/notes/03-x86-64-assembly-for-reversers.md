# 3. x86-64 Assembly for Reversers

You don't need to write assembly — you need to **read** it: follow data, spot control flow, recognize compiler patterns. 90% of reversing is these 20 instructions.

> **Asked as:** "What does this function do?" (shows 15 lines of disassembly)

---

## Registers that matter

| 64-bit | 32-bit | Role in practice |
|---|---|---|
| RAX | EAX | Return value; syscall number (Linux) |
| RDI, RSI, RDX, RCX, R8, R9 | EDI… | Integer args 1–6 (System V). Windows: RCX, RDX, R8, R9 |
| RSP | ESP | Stack pointer — `push`/`call` move it |
| RBP | EBP | Frame pointer (often omitted with `-fomit-frame-pointer`) |
| RIP | EIP | Instruction pointer — `call` pushes it, `ret` pops it |

**Rule of thumb:** `RDI` on function entry = first argument. `EAX` before `ret` = return value.

---

## The 20 instructions

```nasm
mov rax, rbx        ; copy          lea rax, [rbp-8]   ; address math (no deref!)
add/sub/imul       ; arithmetic    xor rax, rax       ; zero a register (fast)
cmp rax, 5         ; compare (sets flags, no store)
je/jne/jl/jle/jg/jge/ja/jb  ; jump if equal / not / less / greater (signed vs unsigned!)
jmp label          ; unconditional
call func / ret    ; call + return
push rbp / pop rbp ; stack save/restore
test rax, rax      ; cmp with self → checks zero (sets ZF)
and/or/xor/shl/shr ; bit ops       ; shr = logical, sar = arithmetic
nop                ; padding/alignment
```

**Signed vs unsigned jumps** is the classic interview trap: `jl/jg` = signed, `jb/ja` = unsigned. `cmp eax, -1; ja fail` fails for *any* value except… think in unsigned: everything except 0xFFFFFFFF is below it.

---

## Patterns to recognize instantly

**Function prologue/epilogue:**
```nasm
push rbp
mov  rbp, rsp
sub  rsp, 0x20      ; locals live at [rbp-8], [rbp-16]...
...
leave               ; = mov rsp, rbp + pop rbp
ret
```

**If/else:**
```nasm
cmp  edi, 0x7b
jle  .else          ; opposite condition jumps away
; ... then-branch ...
jmp  .end
.else:
; ... else-branch ...
.end:
```

**Loop with counter:**
```nasm
mov  ecx, 0
.loop:
cmp  ecx, 10
jge  .done
; ... body, uses ecx ...
add  ecx, 1
jmp  .loop
.done:
```

**String compare / length loops** walk pointers (`movzx eax, byte [rdi+rcx]`) until a `0` byte. **XOR loops** (`xor eax, edx` in a loop over a buffer) = crypto/encoding — flag it.

---

## Calling conventions cheat sheet

| | Linux/macOS (System V) | Windows (x64) |
|---|---|---|
| Int args | RDI RSI RDX RCX R8 R9 | RCX RDX R8 R9 |
| Extra args | Stack | Stack |
| Return | RAX | RAX |
| Syscalls | `syscall`, number in RAX | Via ntdll stubs, `syscall` too |

---

## Key takeaway

Read data flow (where does RDI go? what lands in EAX?), name the control structure (if/loop/switch), and translate to C in your head. Ghidra's decompiler helps — but interviews and obfuscated code demand raw reading skill.
