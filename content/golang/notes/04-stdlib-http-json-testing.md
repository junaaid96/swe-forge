# 4. Standard Library HTTP and JSON

The stdlib is the framework: `net/http` routes and serves, `encoding/json` marshals, `testing` + `synctest` verify. Know it before reaching for Gin/Chi.

> **Asked as:** "How do you structure an HTTP API in Go? How do you test handlers?"

---

## net/http routing (1.22+ patterns)

```go
mux := http.NewServeMux()
mux.HandleFunc("GET /users/{id}", func(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")              // method + path patterns built in
    ...
})
mux.Handle("POST /admin/", authMiddleware(adminMux))

srv := &http.Server{
    Addr: ":8080", Handler: mux,
    ReadTimeout: 5 * time.Second, WriteTimeout: 10 * time.Second, IdleTimeout: 60 * time.Second,
}
log.Fatal(srv.ListenAndServe())
```

Always set timeouts (Slowloris protection). Middleware = `func(http.Handler) http.Handler` chaining: logging → recovery → auth → handler. For OpenAPI/validation-heavy APIs a router lib still helps; for most services the mux suffices.

---

## JSON: tags, zero values, and v2

```go
type User struct {
    ID        int64     `json:"id"`
    Name      string    `json:"name"`
    Nickname  *string   `json:"nickname,omitempty"`   // nil → omitted
    CreatedAt time.Time `json:"created_at,omitzero"`  // 1.24: uses IsZero()
    internal  string    // unexported = never marshalled
}
```

- `omitempty` vs **`omitzero`**: the latter calls `IsZero()` when defined — correct for `time.Time` and custom types.
- Decode strictly at boundaries: `json.Decoder` + `DisallowUnknownFields()` for config; validate after unmarshal.
- **`encoding/json/v2`** (experimental 1.25, maturing through 1.27): cleaner options (`case:ignore`), better errors, and a migration path from v1. Watch it before adopting in libraries.

---

## Testing the Go way

```go
func TestCreateUser(t *testing.T) {
    req := httptest.NewRequest("POST", "/users", strings.NewReader(`{"name":"Ada"}`))
    rec := httptest.NewRecorder()
    handler(rec, req)
    if rec.Code != http.StatusCreated { t.Fatalf("code = %d", rec.Code) }
}

func TestCart(t *testing.T) {
    synctest.Run(func() {   // 1.25+: virtual clock for time-dependent code
        ...                 // time.Sleep advances instantly and deterministically
    })
}
```

Table-driven tests, `httptest` for handlers, `t.Parallel` + `-race` for concurrency, `synctest` for timers/retries, `fuzz` targets (`go test -fuzz`) for parsers. Benchmarks (`BenchmarkXxx` + `benchstat`) before optimizing.

---

## Key takeaway

`net/http` + method patterns + middleware covers most APIs; `encoding/json` tags control the contract; `httptest` + table tests + `synctest` prove it. Frameworks are opt-in, not required.
