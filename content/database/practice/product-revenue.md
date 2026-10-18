---
id: product-revenue
title: Revenue per product
difficulty: medium
tags: [join, aggregation, order-by]
languages: [sql]
runner: sql
estimatedMinutes: 20
learnLinks:
  - database/notes/01-sql-and-data-modelling
---

For every product that sold at least once, return its name and its total revenue (`price × qty` summed over its order lines). Order by revenue descending, breaking ties by name ascending.

Tables: `products(id, name, price)`, `order_lines(id, product_id, qty)`.

## Examples

```
name     | revenue
desk     | 200
pen      | 30
notebook | 15
```

## Learn

Revenue lives across two tables, so join first, multiply per row, then aggregate: `SUM(p.price * o.qty)` grouped by product. An inner join naturally excludes unsold products (nothing to join to). The ordering trap from Top 3 earners applies again — revenue ties need the name tiebreak for a deterministic list.

## Hints

- Join lines to products, then `SUM(price * qty)` per product.
- An inner join already excludes products that never sold.
- `ORDER BY revenue DESC, name ASC` settles ties deterministically.

## Solution

Inner-join order lines to products, group by product, select the name with `SUM(p.price * o.qty) AS revenue`, and order by revenue descending plus the name tiebreak.

## Complexity

Time `O(m)` over the order lines with an index on the join key, space for the grouped output.

## Common mistakes

- `SUM(price) * SUM(qty)` instead of `SUM(price * qty)` — different math.
- A left join that drags unsold products in with `NULL` revenue.
- Aliasing the sum but ordering by the raw expression inconsistently.

```starter:sql
-- Write one query. It runs against the dataset in the problem;
-- hidden tests use extra datasets with the same schema.
SELECT 1;
```

```seed-sql
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price INTEGER);
CREATE TABLE order_lines (id INTEGER PRIMARY KEY, product_id INTEGER, qty INTEGER);
INSERT INTO products VALUES (1, 'pen', 2), (2, 'notebook', 5), (3, 'desk', 200);
INSERT INTO order_lines VALUES (1, 1, 10), (2, 2, 3), (3, 1, 5), (4, 3, 1);
```

```visible-tests
{
  "kind": "sql",
  "cases": [
    {
      "name": "main",
      "expectedColumns": ["name", "revenue"],
      "expectedRows": [["desk", 200], ["pen", 30], ["notebook", 15]]
    },
    {
      "name": "unsold excluded",
      "expectedColumns": ["name", "revenue"],
      "expectedRows": [["pen", 20]],
      "seed": "CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price INTEGER);\nCREATE TABLE order_lines (id INTEGER PRIMARY KEY, product_id INTEGER, qty INTEGER);\nINSERT INTO products VALUES (1, 'pen', 2), (2, 'mug', 7);\nINSERT INTO order_lines VALUES (1, 1, 10);"
    }
  ]
}
```

```hidden-tests
{
  "kind": "sql",
  "cases": [
    {
      "name": "revenue tie",
      "expectedColumns": ["name", "revenue"],
      "expectedRows": [["a-pen", 20], ["b-mug", 20], ["c-desk", 10]],
      "seed": "CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price INTEGER);\nCREATE TABLE order_lines (id INTEGER PRIMARY KEY, product_id INTEGER, qty INTEGER);\nINSERT INTO products VALUES (1, 'a-pen', 2), (2, 'b-mug', 10), (3, 'c-desk', 10);\nINSERT INTO order_lines VALUES (1, 1, 10), (2, 2, 2), (3, 3, 1);"
    },
    {
      "name": "nothing sold",
      "expectedColumns": ["name", "revenue"],
      "expectedRows": [],
      "seed": "CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price INTEGER);\nCREATE TABLE order_lines (id INTEGER PRIMARY KEY, product_id INTEGER, qty INTEGER);\nINSERT INTO products VALUES (1, 'pen', 2);"
    },
    {
      "name": "single line",
      "expectedColumns": ["name", "revenue"],
      "expectedRows": [["widget", 42]],
      "seed": "CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price INTEGER);\nCREATE TABLE order_lines (id INTEGER PRIMARY KEY, product_id INTEGER, qty INTEGER);\nINSERT INTO products VALUES (1, 'widget', 6);\nINSERT INTO order_lines VALUES (1, 1, 7);"
    }
  ]
}
```

```solution:sql
SELECT p.name AS name, SUM(p.price * o.qty) AS revenue
FROM products p JOIN order_lines o ON o.product_id = p.id
GROUP BY p.id, p.name ORDER BY revenue DESC, name ASC;
```
