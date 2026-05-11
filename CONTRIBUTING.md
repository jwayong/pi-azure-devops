# Contributing to @jwayong/pi-azure-devops

Thanks for your interest in contributing!

## Getting Started

```bash
git clone https://github.com/jwayong/pi-azure-devops.git
cd pi-azure-devops
npm install
npm run build
npm test
```

## Development Workflow

1. **Pick an issue** — Check [open issues](https://github.com/jwayong/pi-azure-devops/issues) or create one to discuss your idea.
2. **Create a branch** — `issue-N-description` (e.g., `issue-14-add-pipeline-tools`).
3. **Implement** — Follow the existing patterns in `src/tools/`, `src/config/`, etc.
4. **Test** — All tests must pass (`npm test`). Add tests for new functionality.
5. **Open a PR** — Reference the issue number in the PR description.

## Project Structure

```
src/
├── auth/           # Authentication (PAT, Azure CLI)
├── autocomplete/   # #id work item autocomplete
├── config/         # Configuration resolver
├── extension/      # Pi extension entry point
├── mocks/          # Mock mode handlers + fixtures
├── safety/         # Safety model (open/confirm/readonly)
├── tools/          # Tool implementations
└── utils/          # Connection, errors, formatting
test/               # Node:test test files (mirrors src/)
skills/             # Pi skills (ado-workitems)
prompts/            # Pi prompt templates
```

## Adding a New Tool

1. Create `src/tools/my-tool.ts` — export a tool object with `name`, `description`, `parameters` (typebox), and `execute()`.
2. Add mock handler in `src/mocks/mock-handler.ts` if applicable.
3. Register the tool in `src/extension/index.ts`.
4. If it's a mutation tool, add it to `MUTATION_TOOLS` in `src/tools/shared.ts` and add a `formatMutationSummary` case in `src/safety/index.ts`.
5. If the tool needs team context, use `resolveTeamContext(config, params.team)` from `src/tools/shared.ts` and return an error if undefined.
6. Write tests in `test/tools/` — use mock mode for all tests.
7. Update the skill (`skills/ado-workitems/SKILL.md`) and README tools table.

## Testing

We use Node.js built-in test runner (`node:test`):

```bash
npm test                    # Run all tests
npm run build               # TypeScript compilation
```

All tests use mock mode — no ADO credentials or network access required.

## Code Style

- TypeScript strict mode
- ESM modules with `.js` extensions in imports
- `typebox` for tool parameter schemas
- Error handling via `formatAdoError()` for user-facing messages

## Reporting Issues

- **Bugs**: Include steps to reproduce, expected vs actual behavior, and your config (redact secrets).
- **Features**: Describe the use case and proposed solution.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
