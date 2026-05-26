# Performance Anti-Patterns to Catch in Code Review

Use this checklist when auditing performance in code changes.

---

## 1. N+1 Query Patterns

**The problem:** Making a database query inside a loop, causing N+1 queries.

**What to look for:**

```javascript
// DANGEROUS
users.forEach((user) => {
  const orders = db.query("SELECT * FROM orders WHERE user_id = ?", user.id);
});

// SAFE
const orders = db.query(
  "SELECT * FROM orders WHERE user_id IN (?)",
  users.map((u) => u.id),
);
```

**In diff:**

- Look for `.forEach()`, `.map()`, `for...of` followed by `.find()`, `.query()`, `select`
- ORM: `.find()` inside `.forEach()`

---

## 2. Missing Pagination

**The problem:** Loading all records into memory.

```javascript
// DANGEROUS
const users = db.query("SELECT * FROM users"); // could be millions

// SAFE
const users = db.query("SELECT * FROM users LIMIT 50 OFFSET ?", page * 50);
```

**Signals:**

- New endpoints without `LIMIT`, `page`, or `paginate`
- Missing `take()` / `skip()` in Prisma
- Missing `.limit()` in Sequelize

---

## 3. Unindexed Queries

**The problem:** Queries on columns without database indexes.

**What to look for:**

- `WHERE` on columns without `INDEX`
- `ORDER BY` on non-indexed columns
- `JOIN ON` columns without indexes

```sql
-- Add index for frequently queried columns
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_products_category_status ON products(category_id, status);
```

---

## 4. Synchronous Heavy Operations

**The problem:** CPU-heavy work blocks the event loop.

```javascript
// DANGEROUS (Node.js)
app.get("/api/export-csv", (req, res) => {
  const data = heavyComputation(); // blocks event loop
  res.send(data);
});

// SAFE
app.get("/api/export-csv", async (req, res) => {
  const data = await queue.enqueue("export", { params: req.query });
  res.json({ jobId: data.id });
});
```

---

## 5. Memory Leaks

**The problem:** Objects kept in memory indefinitely.

**What to look for:**

- `setInterval` without `clearInterval`
- `addEventListener` without `removeEventListener`
- Large objects in global scope
- EventEmitter listeners accumulating

```javascript
// DANGEROUS
useEffect(() => {
  const interval = setInterval(fetchData, 5000);
  // missing return cleanup
}, []);

// SAFE
useEffect(() => {
  const interval = setInterval(fetchData, 5000);
  return () => clearInterval(interval);
}, []);
```

---

## 6. Unnecessary Re-renders (React)

**The problem:** Components re-render too often, wasting CPU.

**What to look for:**

- State in child component that should be lifted or global
- Missing `useMemo` for expensive computations
- Missing `React.memo` for stable components
- `useEffect` with wrong/missing dependencies

---

## 7. Large Bundle Additions

**The problem:** New heavy dependencies increase load time.

**What to look for:**

- New imports in client code: `import moment from 'moment'` (use `date-fns` or native)
- `import _ from 'lodash'` (use specific functions: `import debounce from 'lodash/debounce'`)
- Large libraries without lazy loading

---

## 8. Polling Without Debounce

**The problem:** API called on every keystroke.

```javascript
// DANGEROUS
input.addEventListener("input", (e) => {
  search(e.target.value); // calls API on every keystroke
});

// SAFE
input.addEventListener(
  "input",
  debounce((e) => {
    search(e.target.value);
  }, 300),
);
```

---

## 9. Expensive Computations in Render

**The problem:** Heavy JS running on every render.

**What to look for:**

- Array operations (`.filter()`, `.map()`, `.sort()`) inside render functions
- JSON parsing in render
- Regex compilation in render

```javascript
// DANGEROUS
function Component({ data }) {
  const sorted = JSON.parse(JSON.stringify(data)).sort((a, b) => b.price - a.price);
  return <List items={sorted} />;
}

// SAFE
function Component({ data }) {
  const sorted = useMemo(() => [...data].sort((a, b) => b.price - a.price), [data]);
  return <List items={sorted} />;
}
```

---

## Performance Severity

| Issue                              | Severity  |
| ---------------------------------- | --------- |
| N+1 in hot path (>1000 rows)       | 🔴 KRITIS |
| Loading unbounded data into memory | 🔴 KRITIS |
| Sync blocking on main thread       | 🟠 TINGGI |
| Memory leak in request handler     | 🟠 TINGGI |
| Unnecessary re-render (10+/sec)    | 🟡 SEDANG |
| Large bundle without lazy load     | 🟡 SEDANG |
| Polling without debounce           | 🟡 SEDANG |
