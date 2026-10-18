---
id: org-depth
title: Org-chart depth
difficulty: hard
tags: [recursive-cte, hierarchy]
languages: [sql]
runner: sql
estimatedMinutes: 30
learnLinks:
  - database/notes/05-advanced-sql-and-nosql-deep-dive
---

Return every person's name and their depth in the org chart (top bosses with no manager are depth `0`, their reports depth `1`, and so on). Order by depth ascending, then name ascending. The data has no cycles.

Table: `staff(id, name, boss)` where `boss` references another `id` or is `NULL`.

## Examples

```
name | depth
amy  | 0
bo   | 1
cy   | 1
dee  | 2
eli  | 3
```

## Learn

Trees in SQL unfold with a recursive CTE: an anchor query selects the roots (depth `0`), and the recursive arm joins the table back to the CTE, adding one level per round until no new rows appear. `UNION ALL` (not `UNION`) keeps every row including level twins. The pattern generalizes to bills of materials, comment threads and graph reachability.

## Hints

- Anchor on `boss IS NULL` at depth `0`.
- Recurse by joining `staff.boss` to the CTE's `id`, adding 1 to the depth.
- `UNION ALL`, not `UNION` — deduplication would eat legitimate rows.

## Solution

A `WITH RECURSIVE` CTE carrying `(id, name, depth)`: roots at depth 0, then reports of anyone already in the tree at depth + 1. Select name and depth ordered by depth, then name.

## Complexity

Time `O(n · d)` for `n` people and depth `d` (each level scans once), space for the unfolded tree.

## Common mistakes

- `UNION` instead of `UNION ALL`, collapsing same-named levels.
- Forgetting the anchor's depth-`0` literal, or incrementing wrong.
- Joining on the wrong side (`staff.id = tree.boss` walks upward forever).

```starter:sql
-- Write one query. It runs against the dataset in the problem;
-- hidden tests use extra datasets with the same schema.
SELECT 1;
```

```seed-sql
CREATE TABLE staff (id INTEGER PRIMARY KEY, name TEXT, boss INTEGER);
INSERT INTO staff VALUES
  (1, 'amy', NULL),
  (2, 'bo', 1),
  (3, 'cy', 1),
  (4, 'dee', 2),
  (5, 'eli', 4);
```

```visible-tests
{
  "kind": "sql",
  "cases": [
    {
      "name": "main",
      "expectedColumns": ["name", "depth"],
      "expectedRows": [["amy", 0], ["bo", 1], ["cy", 1], ["dee", 2], ["eli", 3]]
    },
    {
      "name": "lone root",
      "expectedColumns": ["name", "depth"],
      "expectedRows": [["solo", 0]],
      "seed": "CREATE TABLE staff (id INTEGER PRIMARY KEY, name TEXT, boss INTEGER);\nINSERT INTO staff VALUES (1, 'solo', NULL);"
    }
  ]
}
```

```hidden-tests
{
  "kind": "sql",
  "cases": [
    {
      "name": "forest",
      "expectedColumns": ["name", "depth"],
      "expectedRows": [["a", 0], ["m", 0], ["b", 1], ["z", 1]],
      "seed": "CREATE TABLE staff (id INTEGER PRIMARY KEY, name TEXT, boss INTEGER);\nINSERT INTO staff VALUES (1, 'a', NULL), (2, 'm', NULL), (3, 'b', 1), (4, 'z', 2);"
    },
    {
      "name": "linear chain",
      "expectedColumns": ["name", "depth"],
      "expectedRows": [["a", 0], ["b", 1], ["c", 2], ["d", 3]],
      "seed": "CREATE TABLE staff (id INTEGER PRIMARY KEY, name TEXT, boss INTEGER);\nINSERT INTO staff VALUES (1, 'a', NULL), (2, 'b', 1), (3, 'c', 2), (4, 'd', 3);"
    },
    {
      "name": "wide",
      "expectedColumns": ["name", "depth"],
      "expectedRows": [["root", 0], ["a", 1], ["b", 1], ["c", 1]],
      "seed": "CREATE TABLE staff (id INTEGER PRIMARY KEY, name TEXT, boss INTEGER);\nINSERT INTO staff VALUES (1, 'root', NULL), (2, 'c', 1), (3, 'a', 1), (4, 'b', 1);"
    }
  ]
}
```

```solution:sql
WITH RECURSIVE tree(id, name, depth) AS (
  SELECT id, name, 0 FROM staff WHERE boss IS NULL
  UNION ALL
  SELECT s.id, s.name, t.depth + 1 FROM staff s JOIN tree t ON s.boss = t.id
)
SELECT name, depth FROM tree ORDER BY depth ASC, name ASC;
```
