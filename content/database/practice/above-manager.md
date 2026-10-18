---
id: above-manager
title: Earning more than the manager
difficulty: hard
tags: [self-join]
languages: [sql]
runner: sql
estimatedMinutes: 25
learnLinks:
  - database/notes/01-sql-and-data-modelling
---

Return the name and salary of every employee earning strictly more than their own manager, ordered by name ascending. Employees without a manager (or with a dangling `manager_id`) never match.

Table: `employees(id, name, salary, manager_id)`.

## Examples

```
name | salary
bo   | 120000
dee  | 150000
```

## Learn

Hierarchies stored as `manager_id` need the table joined to itself: one alias for the employee row, one for the manager row, linked by `e.manager_id = m.id`. The inner join is load-bearing — it drops the CEO (`NULL` manager) and dangling references automatically, since neither finds a partner. Then a plain `>` comparison finishes the job; "strictly more" excludes equals.

## Hints

- Join `employees` to itself: `e` for the employee, `m` for the manager.
- The inner join drops `NULL` and dangling managers for free.
- Strictly more means `>`, not `>=`.

## Solution

Self-join on `e.manager_id = m.id`, filter `e.salary > m.salary`, select the employee's name and salary ordered by name.

## Complexity

Time `O(n)` with an index on the primary key, space for the matching rows.

## Common mistakes

- A left join that keeps the CEO with a `NULL` manager salary (comparison yields `NULL`, usually still excluded — but fragile).
- `>=`, which wrongly includes equal earners.
- Selecting the manager's columns instead of the employee's.

```starter:sql
-- Write one query. It runs against the dataset in the problem;
-- hidden tests use extra datasets with the same schema.
SELECT 1;
```

```seed-sql
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER, manager_id INTEGER);
INSERT INTO employees VALUES
  (1, 'amy', 100000, NULL),
  (2, 'bo', 120000, 1),
  (3, 'cy', 90000, 1),
  (4, 'dee', 150000, 2);
```

```visible-tests
{
  "kind": "sql",
  "cases": [
    {
      "name": "main",
      "expectedColumns": ["name", "salary"],
      "expectedRows": [["bo", 120000], ["dee", 150000]]
    },
    {
      "name": "nobody above",
      "expectedColumns": ["name", "salary"],
      "expectedRows": [],
      "seed": "CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER, manager_id INTEGER);\nINSERT INTO employees VALUES (1, 'amy', 100000, NULL), (2, 'bo', 90000, 1);"
    }
  ]
}
```

```hidden-tests
{
  "kind": "sql",
  "cases": [
    {
      "name": "deep chain",
      "expectedColumns": ["name", "salary"],
      "expectedRows": [["mid", 60000]],
      "seed": "CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER, manager_id INTEGER);\nINSERT INTO employees VALUES (1, 'top', 50000, NULL), (2, 'mid', 60000, 1), (3, 'low', 55000, 2);"
    },
    {
      "name": "equal excluded",
      "expectedColumns": ["name", "salary"],
      "expectedRows": [],
      "seed": "CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER, manager_id INTEGER);\nINSERT INTO employees VALUES (1, 'amy', 100000, NULL), (2, 'bo', 100000, 1);"
    },
    {
      "name": "dangling manager",
      "expectedColumns": ["name", "salary"],
      "expectedRows": [],
      "seed": "CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER, manager_id INTEGER);\nINSERT INTO employees VALUES (1, 'amy', 100000, NULL), (2, 'bo', 200000, 99);"
    }
  ]
}
```

```solution:sql
SELECT e.name AS name, e.salary AS salary
FROM employees e JOIN employees m ON e.manager_id = m.id
WHERE e.salary > m.salary ORDER BY name ASC;
```
