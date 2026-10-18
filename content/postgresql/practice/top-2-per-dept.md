---
id: top-2-per-dept
title: Top 2 earners per department
difficulty: medium
tags: [window-functions, ranking]
languages: [sql]
runner: sql
estimatedMinutes: 20
learnLinks:
  - database/notes/05-advanced-sql-and-nosql-deep-dive
---

Return the top two earners in each department: department, name and salary, ordered by department ascending then salary descending. Departments with fewer than two people contribute everyone they have. Salaries are unique within a department.

Table: `staff(id, name, dept, salary)`.

## Examples

```
dept | name | salary
eng  | amy  | 120000
eng  | bo   | 110000
ops  | eli  | 95000
ops  | dee  | 90000
```

## Learn

"Top N per group" is the textbook window-function problem. `ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC)` numbers each department's staff from the highest paid down, independently per group. Wrap it in a subquery (window functions can't appear in `WHERE`) and keep rows numbered 1–2. `RANK()` would share numbers on ties; `ROW_NUMBER()` never does.

## Hints

- `ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC)` ranks inside each department.
- Window functions can't go in `WHERE` — compute them in a subquery, then filter.
- `rn <= 2` keeps the top two; small departments just contribute fewer rows.

## Solution

Rank staff per department with `ROW_NUMBER()` in a subquery, filter to `rn <= 2` outside, and order by department then salary.

## Complexity

Time `O(n log n)` for the partitioned sort, space for the ranked rows.

## Common mistakes

- Putting the window function in `WHERE` (a syntax error — filter outside).
- A correlated `LIMIT 2` subquery per department (works, but far slower).
- `RANK()` instead of `ROW_NUMBER()`, which can return three rows on a tie.

```starter:sql
-- Write one query. It runs against the dataset in the problem;
-- hidden tests use extra datasets with the same schema.
SELECT 1;
```

```seed-sql
CREATE TABLE staff (id INTEGER PRIMARY KEY, name TEXT, dept TEXT, salary INTEGER);
INSERT INTO staff VALUES
  (1, 'amy', 'eng', 120000),
  (2, 'bo', 'eng', 110000),
  (3, 'cy', 'eng', 100000),
  (4, 'dee', 'ops', 90000),
  (5, 'eli', 'ops', 95000),
  (6, 'fay', 'ops', 80000);
```

```visible-tests
{
  "kind": "sql",
  "cases": [
    {
      "name": "main",
      "expectedColumns": ["dept", "name", "salary"],
      "expectedRows": [["eng", "amy", 120000], ["eng", "bo", 110000], ["ops", "eli", 95000], ["ops", "dee", 90000]]
    },
    {
      "name": "small department",
      "expectedColumns": ["dept", "name", "salary"],
      "expectedRows": [["solo", "amy", 50000]],
      "seed": "CREATE TABLE staff (id INTEGER PRIMARY KEY, name TEXT, dept TEXT, salary INTEGER);\nINSERT INTO staff VALUES (1, 'amy', 'solo', 50000);"
    }
  ]
}
```

```hidden-tests
{
  "kind": "sql",
  "cases": [
    {
      "name": "three departments",
      "expectedColumns": ["dept", "name", "salary"],
      "expectedRows": [["a", "a2", 20], ["a", "a1", 10], ["b", "b1", 99], ["c", "c2", 7], ["c", "c1", 5]],
      "seed": "CREATE TABLE staff (id INTEGER PRIMARY KEY, name TEXT, dept TEXT, salary INTEGER);\nINSERT INTO staff VALUES (1, 'a1', 'a', 10), (2, 'a2', 'a', 20), (3, 'a3', 'a', 1), (4, 'b1', 'b', 99), (5, 'c1', 'c', 5), (6, 'c2', 'c', 7), (7, 'c3', 'c', 1);"
    },
    {
      "name": "single department",
      "expectedColumns": ["dept", "name", "salary"],
      "expectedRows": [["eng", "b", 200], ["eng", "a", 100]],
      "seed": "CREATE TABLE staff (id INTEGER PRIMARY KEY, name TEXT, dept TEXT, salary INTEGER);\nINSERT INTO staff VALUES (1, 'a', 'eng', 100), (2, 'b', 'eng', 200), (3, 'c', 'eng', 50);"
    },
    {
      "name": "empty staff",
      "expectedColumns": ["dept", "name", "salary"],
      "expectedRows": [],
      "seed": "CREATE TABLE staff (id INTEGER PRIMARY KEY, name TEXT, dept TEXT, salary INTEGER);"
    }
  ]
}
```

```solution:sql
SELECT dept, name, salary FROM (
  SELECT dept, name, salary, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC, id ASC) AS rn
  FROM staff
) WHERE rn <= 2 ORDER BY dept ASC, salary DESC;
```
