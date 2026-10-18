---
id: missing-emails
title: Users without emails
difficulty: easy
tags: [where, null]
languages: [sql]
runner: sql
estimatedMinutes: 10
learnLinks:
  - database/notes/01-sql-and-data-modelling
---

Return the names of users with no usable email — that is, `NULL` or the empty string — ordered by `id` ascending. A string of spaces still counts as present.

Table: `users(id, name, email)`.

## Examples

With two valid emails, one `NULL` and one empty string, the query returns:

```
name
bo
cy
```

With every email filled in, it returns no rows at all.

## Learn

`NULL` means "unknown", and every comparison with it yields `NULL` (not true), so `email = NULL` never matches — the `IS NULL` test exists for exactly this. Empty strings are a separate case: `''` is a known value that happens to be empty, so it needs an explicit `= ''` check. Real data mixes both, which is why the condition is `email IS NULL OR email = ''`.

## Hints

- `= NULL` never matches — use `IS NULL`.
- Empty strings are not `NULL`, so check for both.
- `ORDER BY id` keeps the output in a stable order.

## Solution

Filter with `WHERE email IS NULL OR email = ''`, select the name, order by id.

## Complexity

Time `O(n)` table scan, space for the matching rows.

## Common mistakes

- `WHERE email = NULL`, which matches nothing.
- Forgetting the empty-string half of the condition.
- No `ORDER BY`, leaving row order to chance.

```starter:sql
-- Write one query. It runs against the dataset in the problem;
-- hidden tests use extra datasets with the same schema.
SELECT 1;
```

```seed-sql
CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);
INSERT INTO users VALUES
  (1, 'amy', 'amy@x.dev'),
  (2, 'bo', NULL),
  (3, 'cy', ''),
  (4, 'dee', 'dee@x.dev');
```

```visible-tests
{
  "kind": "sql",
  "cases": [
    {
      "name": "main",
      "expectedColumns": ["name"],
      "expectedRows": [["bo"], ["cy"]]
    },
    {
      "name": "all valid",
      "expectedColumns": ["name"],
      "expectedRows": [],
      "seed": "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);\nINSERT INTO users VALUES (1, 'amy', 'a@x.dev'), (2, 'bo', 'b@x.dev');"
    }
  ]
}
```

```hidden-tests
{
  "kind": "sql",
  "cases": [
    {
      "name": "all missing",
      "expectedColumns": ["name"],
      "expectedRows": [["a"], ["b"]],
      "seed": "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);\nINSERT INTO users VALUES (1, 'a', NULL), (2, 'b', '');"
    },
    {
      "name": "spaces count as present",
      "expectedColumns": ["name"],
      "expectedRows": [["y"]],
      "seed": "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);\nINSERT INTO users VALUES (1, 'x', ' '), (2, 'y', NULL);"
    },
    {
      "name": "id order",
      "expectedColumns": ["name"],
      "expectedRows": [["y"], ["x"]],
      "seed": "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);\nINSERT INTO users VALUES (3, 'x', NULL), (1, 'y', '');"
    }
  ]
}
```

```solution:sql
SELECT name FROM users WHERE email IS NULL OR email = '' ORDER BY id;
```
