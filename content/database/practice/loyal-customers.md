---
id: loyal-customers
title: Customers with 2+ orders
difficulty: medium
tags: [group-by, having, join]
languages: [sql]
runner: sql
estimatedMinutes: 20
learnLinks:
  - database/notes/01-sql-and-data-modelling
---

Return the name and order count of every customer with at least two orders, ordered by order count descending then name ascending.

Tables: `customers(id, name)`, `orders(id, customer_id)`.

## Examples

```
name | orders
amy  | 3
bo   | 2
```

## Learn

`WHERE` filters rows before grouping; `HAVING` filters groups after it. "Customers with at least two orders" is a property of each customer's group, not of any single row, so it belongs in `HAVING COUNT(*) >= 2`. The usual shape is join → group → having → order, and mixing up where the condition goes is the classic mistake.

## Hints

- Join orders to customers and group by customer.
- The "at least two" test goes in `HAVING`, not `WHERE` — it is about the group.
- `ORDER BY orders DESC, name ASC` ranks by count with a stable tiebreak.

## Solution

Inner-join orders to customers, group by customer, keep groups with `HAVING COUNT(o.id) >= 2`, and order by the count descending plus the name tiebreak.

## Complexity

Time `O(m)` over the orders with an index on the join key, space for the grouped output.

## Common mistakes

- Putting the count condition in `WHERE` (aggregate functions aren't allowed there).
- `COUNT(*)` vs `COUNT(o.id)` confusion (equivalent here thanks to the inner join).
- Forgetting the name tiebreak in the ordering.

```starter:sql
-- Write one query. It runs against the dataset in the problem;
-- hidden tests use extra datasets with the same schema.
SELECT 1;
```

```seed-sql
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER);
INSERT INTO customers VALUES (1, 'amy'), (2, 'bo'), (3, 'cy');
INSERT INTO orders VALUES (1, 1), (2, 1), (3, 1), (4, 2), (5, 2), (6, 3);
```

```visible-tests
{
  "kind": "sql",
  "cases": [
    {
      "name": "main",
      "expectedColumns": ["name", "orders"],
      "expectedRows": [["amy", 3], ["bo", 2]]
    },
    {
      "name": "nobody qualifies",
      "expectedColumns": ["name", "orders"],
      "expectedRows": [],
      "seed": "CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);\nCREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER);\nINSERT INTO customers VALUES (1, 'amy'), (2, 'bo');\nINSERT INTO orders VALUES (1, 1), (2, 2);"
    }
  ]
}
```

```hidden-tests
{
  "kind": "sql",
  "cases": [
    {
      "name": "tied counts",
      "expectedColumns": ["name", "orders"],
      "expectedRows": [["ann", 2], ["zed", 2]],
      "seed": "CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);\nCREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER);\nINSERT INTO customers VALUES (1, 'zed'), (2, 'ann');\nINSERT INTO orders VALUES (1, 1), (2, 1), (3, 2), (4, 2);"
    },
    {
      "name": "exactly two qualifies",
      "expectedColumns": ["name", "orders"],
      "expectedRows": [["solo", 2]],
      "seed": "CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);\nCREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER);\nINSERT INTO customers VALUES (1, 'solo'), (2, 'once');\nINSERT INTO orders VALUES (1, 1), (2, 1), (3, 2);"
    },
    {
      "name": "bigger data",
      "expectedColumns": ["name", "orders"],
      "expectedRows": [["bo", 4], ["amy", 2], ["dee", 2]],
      "seed": "CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);\nCREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER);\nINSERT INTO customers VALUES (1, 'amy'), (2, 'bo'), (3, 'cy'), (4, 'dee');\nINSERT INTO orders VALUES (1, 2), (2, 2), (3, 4), (4, 1), (5, 2), (6, 4), (7, 1), (8, 2);"
    }
  ]
}
```

```solution:sql
SELECT c.name AS name, COUNT(o.id) AS orders
FROM customers c JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name HAVING COUNT(o.id) >= 2 ORDER BY orders DESC, name ASC;
```
