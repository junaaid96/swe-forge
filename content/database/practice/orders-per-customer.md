---
id: orders-per-customer
title: Orders per customer
difficulty: easy
tags: [join, group-by, aggregation]
languages: [sql]
runner: sql
estimatedMinutes: 15
learnLinks:
  - database/notes/01-sql-and-data-modelling
---

For every customer, return their name, their number of orders, and their total spent — including customers with zero orders (count `0`, spent `0`). Order by name ascending.

Tables: `customers(id, name)`, `orders(id, customer_id, total)`.

## Examples

```
name | orders | spent
amy  | 2      | 80
bo   | 1      | 20
cy   | 0      | 0
```

## Learn

"Every X, even with no Y" is the signature of a `LEFT JOIN`: it keeps all left rows and fills `NULL` where nothing matches. Then `COUNT(right.id)` counts only matches (`NULL`s don't count), while `SUM()` over no rows yields `NULL` — hence `COALESCE(..., 0)`. Group by the customer to collapse each person's orders into one row.

## Hints

- `LEFT JOIN` keeps customers with no orders; an inner join would drop them.
- `COUNT(o.id)` counts matches only, because `COUNT` skips `NULL`.
- `SUM` of nothing is `NULL`, so wrap it in `COALESCE(..., 0)`.

## Solution

Left-join orders onto customers, group by customer, and select the name with `COUNT(o.id)` and `COALESCE(SUM(o.total), 0)`, ordered by name.

## Complexity

Time `O(n + m)` for `n` customers and `m` orders with an index on the join key, space for the grouped output.

## Common mistakes

- Inner join, which silently drops customers with no orders.
- `COUNT(*)` instead of `COUNT(o.id)` — it counts the `NULL`-extended row as 1.
- Forgetting `COALESCE`, leaving `NULL` instead of `0` for non-buyers.

```starter:sql
-- Write one query. It runs against the dataset in the problem;
-- hidden tests use extra datasets with the same schema.
SELECT 1;
```

```seed-sql
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, total INTEGER);
INSERT INTO customers VALUES (1, 'amy'), (2, 'bo'), (3, 'cy');
INSERT INTO orders VALUES (1, 1, 50), (2, 1, 30), (3, 2, 20);
```

```visible-tests
{
  "kind": "sql",
  "cases": [
    {
      "name": "main",
      "expectedColumns": ["name", "orders", "spent"],
      "expectedRows": [["amy", 2, 80], ["bo", 1, 20], ["cy", 0, 0]]
    },
    {
      "name": "no orders at all",
      "expectedColumns": ["name", "orders", "spent"],
      "expectedRows": [["amy", 0, 0], ["bo", 0, 0]],
      "seed": "CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);\nCREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, total INTEGER);\nINSERT INTO customers VALUES (1, 'amy'), (2, 'bo');"
    }
  ]
}
```

```hidden-tests
{
  "kind": "sql",
  "cases": [
    {
      "name": "bigger data",
      "expectedColumns": ["name", "orders", "spent"],
      "expectedRows": [["amy", 1, 10], ["bo", 3, 60], ["cy", 0, 0], ["dee", 2, 25]],
      "seed": "CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);\nCREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, total INTEGER);\nINSERT INTO customers VALUES (1, 'amy'), (2, 'bo'), (3, 'cy'), (4, 'dee');\nINSERT INTO orders VALUES (1, 2, 10), (2, 4, 20), (3, 2, 30), (4, 1, 10), (5, 4, 5), (6, 2, 20);"
    },
    {
      "name": "null total",
      "expectedColumns": ["name", "orders", "spent"],
      "expectedRows": [["amy", 2, 50]],
      "seed": "CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);\nCREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, total INTEGER);\nINSERT INTO customers VALUES (1, 'amy');\nINSERT INTO orders VALUES (1, 1, 50), (2, 1, NULL);"
    },
    {
      "name": "single non-buyer",
      "expectedColumns": ["name", "orders", "spent"],
      "expectedRows": [["solo", 0, 0]],
      "seed": "CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);\nCREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, total INTEGER);\nINSERT INTO customers VALUES (1, 'solo');"
    }
  ]
}
```

```solution:sql
SELECT c.name AS name, COUNT(o.id) AS orders, COALESCE(SUM(o.total), 0) AS spent
FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name ORDER BY c.name;
```
