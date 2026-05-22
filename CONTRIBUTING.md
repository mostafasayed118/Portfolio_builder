# Contributing to Portfolio-Fixer

Thank you for your interest in contributing to Portfolio-Fixer!

## Development Setup

```bash
# Install dependencies
pnpm install

# Start all services
pnpm dev

# Start individual services
pnpm --filter @workspace/portfolio dev   # Port 5173
pnpm --filter @workspace/admin dev       # Port 5174
pnpm --filter @workspace/api-server dev  # Port 3001
```

## Code Style

- Use TypeScript with strict mode
- Use Tailwind CSS for styling (prefer classes over inline styles)
- Use `pnpm` as the package manager (npm is not allowed)
- Follow existing naming conventions (snake_case for DB, camelCase for JS)

## Testing

```bash
# Run all tests
pnpm run test

# Run tests with coverage
pnpm run test --coverage

# Run tests in watch mode
pnpm run test --watch
```

## Project Structure

```
artifacts/
  portfolio/    # Public portfolio SPA
  admin/        # Admin CMS dashboard
  api-server/   # Express REST API

lib/            # Shared libraries
  db/           # Supabase database functions
  ui/           # Shared UI components
  validation/   # Zod validation schemas
  supabase/     # Supabase clients
  auth/         # Authentication utilities

supabase/
  migrations/   # Database migrations
```

## Adding New Features

1. Create a branch: `git checkout -b feature/your-feature`
2. Make changes and add tests
3. Run `pnpm run typecheck` to verify types
4. Run `pnpm run test` to ensure tests pass
5. Commit and push
6. Open a pull request

## Pull Request Guidelines

- Include a clear description of the changes
- Add tests for new functionality
- Ensure all tests pass
- Update documentation if needed

## Reporting Issues

- Use GitHub Issues for bug reports
- Include reproduction steps
- Include environment details

---

For more details, see [MEMORY_BANK.md](./MEMORY_BANK.md) and [ARCHITECTURE.md](./docs/ARCHITECTURE.md).