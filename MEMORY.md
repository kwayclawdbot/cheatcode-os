# Project Memory — CheatCode OS

Persistent instructions and constraints to follow across all tasks.

---

## Scope Constraint (set Apr 8, 2026)

**Frontend only.** Do not touch any backend files. This includes:
- `server/` directory (all files)
- `drizzle/` directory (schema, migrations)
- `server/routers/` (tRPC procedures)
- `server/db.ts`
- `server/storage.ts`
- `server/_core/` (all core infrastructure)

**Allowed files:**
- `client/src/` (all frontend React/TS/CSS)
- `client/index.html`
- `client/public/`
- `shared/` (read-only for types — do not modify)
- `todo.md`, `MEMORY.md`, `ideas.md` (project docs)

If a frontend bug requires a backend fix, flag it to the user and ask them to handle it or confirm an exception.
