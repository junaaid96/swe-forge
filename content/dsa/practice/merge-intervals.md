---
id: merge-intervals
title: Merge overlapping intervals
difficulty: hard
tags: [arrays, sorting, intervals]
languages: [javascript, typescript]
runner: js
estimatedMinutes: 25
learnLinks:
  - dsa/notes/02-patterns-and-problem-solving
---

Given a list of `[start, end]` intervals, merge every overlapping pair and return the merged list sorted by start. Touching intervals (`[1, 4]` and `[4, 5]`) count as overlapping. Do not modify the input.

## Examples

```js
merge([[1, 3], [2, 6], [8, 10], [15, 18]]); // [[1, 6], [8, 10], [15, 18]]
merge([[1, 4], [4, 5]]); // [[1, 5]]
merge([[1, 4], [2, 3]]); // [[1, 4]]
```

## Learn

Calendars, booking systems and genome ranges all merge intervals the same way: sort by start, then sweep once. Sorting is the key insight — after it, each interval can only overlap the merged interval right before it, so one linear pass decides everything: extend the last interval when they overlap, otherwise start a new one.

## Hints

- Sort by start first — then each interval only needs comparing with the previous merged one.
- Overlap (including touching) means `start <= lastEnd`; merging extends the end to the max of both.
- Copy before you mutate, or the caller's array changes under them.

## Solution

Copy and sort by start, then sweep: keep an output list, and for each interval either extend the last output's end (`start <= lastEnd`, taking `max`) or push a new entry. Copies on the way in keep the input untouched.

## Complexity

Time `O(n log n)` for the sort, space `O(n)` for the output (plus the sort's scratch space).

## Common mistakes

- Forgetting to sort, or sorting by end.
- Strict `<` instead of `<=`, so touching intervals stay split.
- Mutating the input intervals while merging.

```starter:javascript
function merge(intervals) {
  // TODO: merge overlaps, return sorted by start
  return [];
}
```

```starter:typescript
function merge(intervals: Array<[number, number]>): Array<[number, number]> {
  // TODO: merge overlaps, return sorted by start
  return [];
}
```

```visible-tests
{
  "kind": "fn",
  "function": "merge",
  "cases": [
    { "name": "classic", "args": [[[1, 3], [2, 6], [8, 10], [15, 18]]], "expected": [[1, 6], [8, 10], [15, 18]] },
    { "name": "touching", "args": [[[1, 4], [4, 5]]], "expected": [[1, 5]] },
    { "name": "contained", "args": [[[1, 4], [2, 3]]], "expected": [[1, 4]] }
  ]
}
```

```hidden-tests
{
  "kind": "fn",
  "function": "merge",
  "cases": [
    { "name": "empty", "args": [[]], "expected": [] },
    { "name": "single point", "args": [[[5, 5]]], "expected": [[5, 5]] },
    { "name": "one swallows all", "args": [[[1, 10], [2, 3], [4, 5]]], "expected": [[1, 10]] },
    { "name": "unsorted disjoint", "args": [[[3, 4], [1, 2]]], "expected": [[1, 2], [3, 4]] }
  ]
}
```

```solution:javascript
function merge(intervals) {
  if (intervals.length < 2) return intervals.map(([a, b]) => [a, b]);
  const sorted = intervals
    .map(([a, b]) => [a, b])
    .sort((x, y) => x[0] - y[0]);
  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const [s, e] = sorted[i];
    if (s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}
```

```solution:typescript
function merge(intervals: Array<[number, number]>): Array<[number, number]> {
  if (intervals.length < 2) return intervals.map(([a, b]: [number, number]): [number, number] => [a, b]);
  const sorted = intervals
    .map(([a, b]: [number, number]): [number, number] => [a, b])
    .sort((x, y) => x[0] - y[0]);
  const out: Array<[number, number]> = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const [s, e] = sorted[i];
    if (s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}
```
