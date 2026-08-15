# Supabase Migrations

This directory contains all database migrations for the portfolio project.

## Numbering Convention

Migrations are numbered sequentially (`001_`, `002_`, etc.) and committed in order.

## Numbering

Migrations are numbered sequentially `001_` through `047_` with no gaps. Earlier development had gaps at 010 and 016–019; those numbers were filled in when the migration set was consolidated, so the numbering is now contiguous.

## Applying Migrations

```bash
supabase migration up
```
