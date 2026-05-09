# @jwayong/pi-azure-devops

Azure DevOps integration for [Pi coding agent](https://github.com/earendil-works/pi-mono) — work items, pipelines, repos, and more.

## Install

```bash
pi install npm:@jwayong/pi-azure-devops
```

Or try without installing:

```bash
pi -e npm:@jwayong/pi-azure-devops
```

## Features

### Phase 1: Work Items (current)

- **10 tools** — get, query, create, update, comment, link, revise, list types, doctor
- **Dual auth** — PAT (`ADO_PAT`) or Azure CLI (`az`) with auto-detect
- **Dual config** — environment variables or `.pi/settings.json`
- **Safety model** — `open` / `confirm` / `readonly` (default: `confirm`)
- **Mock mode** — work offline with fixture data (`ADO_MOCK=1`)
- **Autocomplete** — `#1234` work item ID completion
- **Skill** — `ado-workitems` with WIQL reference and operating rules
- **Prompt templates** — `/ado-triage`, `/ado-status-report`, `/ado-create-batch`, `/ado-review-history`

### Coming Later

- Phase 2: Pipelines (builds & releases)
- Phase 3: Repos & Pull Requests
- Phase 4: Test Plans
- Phase 5: Boards & Backlogs

## Quick Start

### 1. Set environment variables

```bash
export ADO_ORG_URL="https://dev.azure.com/myorg"
export ADO_PROJECT="MyProject"
export ADO_PAT="your-personal-access-token"
```

Or configure in `.pi/settings.json`:

```jsonc
{
  "ado": {
    "orgUrl": "https://dev.azure.com/myorg",
    "project": "MyProject",
    "authMethod": "pat",
    "safetyLevel": "confirm"
  }
}
```

### 2. Verify connection

```
> Use the ado_doctor tool to check my ADO configuration
```

### 3. Use it

```
> Query all active bugs assigned to me
> Create a user story titled "Implement login page" with description "..."
> Update work item #1234 state to Closed
```

## Authentication

| Method | Setup | Best for |
|--------|-------|----------|
| **PAT** | Set `ADO_PAT` env var | Personal use, CI |
| **Azure CLI** | Run `az login` | Enterprise, Entra ID, managed identity |

Auto-detect: tries Azure CLI first, falls back to PAT.

## Safety Levels

| Level | Behavior |
|-------|----------|
| `open` | No confirmation on mutations |
| `confirm` *(default)* | User confirms before create/update/comment/link operations |
| `readonly` | Mutation tools blocked entirely |

Set via `ADO_SAFETY_LEVEL` env var or `ado.safetyLevel` in settings.

## Mock Mode

Work offline without ADO credentials:

```bash
ADO_MOCK=1 pi "Show me work item #101"
```

Or pass `{ mock: true }` to any tool parameter.

## Configuration Reference

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ADO_ORG_URL` | Organization URL |
| `ADO_PROJECT` | Default project |
| `ADO_PAT` | Personal Access Token |
| `ADO_AUTH_METHOD` | `pat`, `azure-cli`, or `auto` (default: `auto`) |
| `ADO_SAFETY_LEVEL` | `open`, `confirm`, or `readonly` (default: `confirm`) |
| `ADO_MOCK` | Set to `1` to enable mock mode |
| `ADO_MAX_QUERY_RESULTS` | Max query results (default: `100`) |

### Settings (`ado` key in `.pi/settings.json`)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `orgUrl` | string | — | Organization URL |
| `project` | string | — | Default project |
| `authMethod` | string | `"auto"` | `pat`, `azure-cli`, or `auto` |
| `safetyLevel` | string | `"confirm"` | `open`, `confirm`, or `readonly` |
| `defaultWorkItemType` | string | `"User Story"` | Default type for create |
| `maxQueryResults` | number | `100` | Max query results |
| `autocomplete` | boolean | `true` | Enable `#id` completion |

**Precedence:** env vars → settings.json → defaults

## Development

```bash
git clone https://github.com/jwayong/pi-azure-devops.git
cd pi-azure-devops
npm install
npm run build
npm test

# Test locally with pi
pi -e ./
```

## Contributing

Contributions welcome! Please open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)
