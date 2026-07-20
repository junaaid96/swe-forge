---
id: ai-ml-deep-theory
track: theory
---

# AI / ML Engineering — Deep: Theory

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## AI Engineering

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### What Changed in 2026 Interviews

Classic designs (URL shortener, feed, chat, rate limiter) still appear in roughly half of senior rounds.

What is newly mainstream:
• RAG-backed assistants over private docs
• Vector search at scale
• LLM inference APIs (streaming, batching, caching)
• Long-running agent infrastructure (tools, sandbox, checkpoints)

You still use queues, caches, sharding, and load balancers — plus embedders, vector stores, LLM gateways, and eval harnesses.

### RAG Building Blocks

Ingest: load docs → clean → chunk (size/overlap matter) → embed → upsert to vector DB.
Retrieve: embed query → ANN search top-k → optional rerank → build grounded prompt.
Generate: LLM answers with citations; refuse when retrieval is weak.
Operate: freshness (re-index), evaluation (groundedness, relevance), cost/latency budgets, PII redaction.

Chunking mistakes cause most “dumb chatbot” failures. Bad chunks → bad retrieval → confident nonsense.

### LLM Systems Concerns

Latency: TTFT (time to first token) vs total time; stream tokens to users.
Cost: tokens in/out; cache repeated prompts; route easy queries to smaller models.
Reliability: timeouts, retries with idempotency, provider fallbacks, circuit breakers.
Safety: prompt injection defenses, tool allow-lists, output filtering.
Quality: offline eval sets + online feedback; never ship without measurement.

### Agents (Carefully)

Agents plan → call tools → observe → repeat. Production needs:
• Sandboxed tool execution (no raw prod credentials)
• Persistent memory / checkpoints for long runs
• Human-in-the-loop for irreversible actions
• Trace every tool call for debugging
• Hard budgets (time, tokens, dollars)

Interview framing: same distributed-systems fundamentals + explicit failure modes for non-deterministic model behavior.

### Practical code

```
// Minimal RAG flow (TypeScript-shaped pseudo)
async function answer(question: string): Promise<Answer> {
  const qVec = await embed(question);
  const hits = await vectorDb.query(qVec, { topK: 8 });
  const reranked = await reranker.rerank(question, hits).slice(0, 4);

  if (reranked[0]?.score < MIN_SCORE) {
    return { text: "I don't have enough grounded context.", citations: [] };
  }

  const context = reranked.map(h => `[${h.id}] ${h.text}`).join("\n");
  const prompt = `Use only the context. Cite ids.\n${context}\nQ: ${question}`;

  const cached = await semanticCache.get(prompt);
  if (cached) return cached;

  const completion = await llm.chat({ model: "fast-or-strong", prompt, maxTokens: 512 });
  const answer = { text: completion.text, citations: reranked.map(h => h.id) };
  await semanticCache.set(prompt, answer, { ttlHours: 24 });
  metrics.tokens.add(completion.usage.total);
  return answer;
}
```

### Tips

- Lead with fundamentals, then add AI components — do not skip capacity estimates.
- Always mention evaluation and cost/latency budgets for LLM features.
- Citations + refusal-when-unsure beat a flashy but ungrounded demo.
- For agents: sandbox + audit trail + spend limits are interview gold.
