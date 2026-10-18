---
id: top-earners
title: Top 3 earners
difficulty: easy
tags: [select, order-by, limit]
languages: [sql]
runner: sql
estimatedMinutes: 10
learnLinks:
  - database/notes/01-sql-and-data-modelling
---

Return the names and salaries of the three highest-paid employees, ordered by salary descending. Break salary ties by name ascending so the order is deterministic.

## Examples

With five employees, the query returns the top three:

```
name | salary
bo   | 120000
dee  | 110000
eli  |  95000
```

## Learn

`ORDER BY` sorts rows, and `LIMIT` keeps the first N — together they answer every "top N" question. The subtle part is ties: without a unique tiebreak, equal salaries can come back in any order, making tests flaky. `ORDER BY salary DESC, name ASC` sorts by salary first and uses the name only to settle ties.

## Hints

- `ORDER BY salary DESC` puts the highest paid first.
- `LIMIT 3` keeps just the top three rows.
- Add `, name ASC` to the `ORDER BY` so tied salaries always order the same way.

## Solution

Select name and salary, order by salary descending with a name tiebreak, and limit to three rows. Fewer than three employees simply returns fewer rows; an empty table returns none.

## Complexity

Time `O(n log n)` for the sort (an index on salary would make it `O(k)` for the top rows), space `O(1)` besides the output.

## Common mistakes

- Forgetting the tiebreak, so equal salaries order randomly.
- `ORDER BY salary ASC` (cheapest first) or missing `DESC`.
- Selecting `*` instead of the required columns.

```starter:sql
-- Write one query. It runs against the dataset in the problem;
-- hidden tests use extra datasets with the same schema.
SELECT 1;
```

```seed-sql
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER);
INSERT INTO employees VALUES
  (1, 'amy', 90000),
  (2, 'bo', 120000),
  (3, 'cy', 75000),
  (4, 'dee', 110000),
  (5, 'eli', 95000);
```

```visible-tests
{
  "kind": "sql",
  "cases": [
    {
      "name": "top three",
      "expectedColumns": ["name", "salary"],
      "expectedRows": [["bo", 120000], ["dee", 110000], ["eli", 95000]]
    },
    {
      "name": "fewer than three",
      "expectedColumns": ["name", "salary"],
      "expectedRows": [["bo", 50000], ["amy", 40000]],
      "seed": "CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER);\nINSERT INTO employees VALUES (1, 'amy', 40000), (2, 'bo', 50000);"
    }
  ]
}
```

```hidden-tests
{
  "kind": "sql",
  "cases": [
    {
      "name": "tie break by name",
      "expectedColumns": ["name", "salary"],
      "expectedRows": [["amy", 100000], ["bo", 100000], ["dee", 100000]],
      "seed": "CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER);\nINSERT INTO employees VALUES (1, 'amy', 100000), (2, 'bo', 100000), (3, 'cy', 90000), (4, 'dee', 100000);"
    },
    {
      "name": "empty table",
      "expectedColumns": ["name", "salary"],
      "expectedRows": [],
      "seed": "CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER);"
    },
    {
      "name": "different data",
      "expectedColumns": ["name", "salary"],
      "expectedRows": [["zara", 200000], ["max", 150000], ["kim", 140000]],
      "seed": "CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER);\nINSERT INTO employees VALUES (1, 'kim', 140000), (2, 'zara', 200000), (3, 'leo', 30000), (4, 'max', 150000);"
    }
  ]
}
```

```solution:sql
SELECT name, salary FROM employees ORDER BY salary DESC, name ASC LIMIT 3;
```
