# Supabase Migrations

This directory contains all database migrations for the portfolio project.

## Numbering Convention

Migrations are numbered sequentially (`001_`, `002_`, etc.) and committed in order.

## Gap Notes

Some migration numbers are intentionally skipped:

- **010**: Was a placeholder for image metadata schema — never needed due to in-app tracking approach
- **016, 017, 018, 019**: Were placeholder slabs for feature branches that were merged into other migrations during squash commits. No data was lost; the schema changes they represented are present in surrounding migrations.

If you see a gap in numbering, it is **intentional and safe** — no schema or data changes were lost.

## Applying Migrations

```bash
supabase migration up
```
