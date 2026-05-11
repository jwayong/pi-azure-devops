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

- **19 tools** — work items, boards, sprints, iterations, capacity, and more
- **Dual auth** — PAT (`ADO_PAT`) or Azure CLI (`az`) with auto-detect
- **Dual config** — environment variables or `.pi/settings.json`
- **Safety model** — `open` / `confirm` / `readonly` (default: `confirm`)
- **Mock mode** — work offline with fixture data (`ADO_MOCK=1`)
- **Autocomplete** — `#1234` work item ID completion
- **Skill** — `ado-workitems` with WIQL, board, sprint, and capacity reference
- **7 prompt templates** — triage, status reports, batch create, review history, sprint health, sprint planning, board review
- **338 tests** — comprehensive coverage, all offline

### What's Included

| Area | Tools | Read | Write |
|------|-------|------|-------|
| Work Items | CRUD, comments, links, revisions, WIQL queries | 6 | 4 |
| Teams | List teams | 1 | — |
| Boards | List boards, get/set board columns | 2 | 1 |
| Sprints | List iterations, get/set sprint assignments | 2 | 1 |
| Capacity | Get/set team member capacity | 1 | 1 |
| Config | Doctor (health check) | 1 | — |

### Coming Later

- Phase 2: Pipelines (builds & releases)
- Phase 3: Repos & Pull Requests
- Phase 4: Test Plans

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

### 4. Use prompt templates

Type `/` in the prompt editor to see available templates:

| Command | Description |
|---------|-------------|
| `/ado-triage [filter]` | Triage untriaged work items — suggest priority, area, iteration, assignee |
| `/ado-status-report [group-by]` | Generate a status report grouped by state, assignee, iteration, or type |
| `/ado-create-batch <items>` | Batch-create work items from a structured list |
| `/ado-review-history <id>` | Review revision history with a chronological narrative |
| `/ado-sprint-health [team]` | Sprint health check — status, capacity, burndown |
| `/ado-plan-sprint <sprint\|next>` | Sprint planning — propose work assignment based on capacity |
| `/ado-board-review <board> [team]` | Board review — analyze setup and suggest improvements |

Examples:

```
/ado-triage AND [System.WorkItemType] = 'Bug'
/ado-status-report assignee
/ado-create-batch - Bug: Fix crash [priority:1]  - Task: Update docs
/ado-review-history 1234
/ado-sprint-health Engineering
/ado-plan-sprint next
/ado-board-review Stories Engineering
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

## Tools Reference

### Read Tools

| Tool | Description |
|------|-------------|
| `ado_doctor` | Verify configuration, auth, and connection health |
| `ado_get_work_item` | Get a single work item by ID |
| `ado_query_work_items` | Search work items using WIQL queries |
| `ado_list_work_item_types` | List valid work item types for the project |
| `ado_get_work_item_comments` | Get comments/discussion on a work item |
| `ado_get_work_item_revisions` | Get revision/change history for a work item |
| `ado_list_teams` | List teams in the project |
| `ado_list_boards` | List boards for a team |
| `ado_get_board` | Get board detail with columns and state mappings |
| `ado_list_iterations` | List sprints/iterations for a team |
| `ado_get_iteration_work_items` | Get work items in a sprint |
| `ado_get_capacity` | Get sprint capacity per member with totals |

### Write Tools (gated by safety level)

| Tool | Description |
|------|-------------|
| `ado_create_work_item` | Create a new work item (type, title, description, fields) |
| `ado_update_work_item` | Update fields on an existing work item |
| `ado_add_work_item_comment` | Add a comment to a work item |
| `ado_manage_work_item_links` | Add or remove relation links between work items |
| `ado_set_board_columns` | Reconfigure board columns |
| `ado_set_iteration` | Add or remove iteration to/from team |
| `ado_set_capacity` | Set sprint capacity for team members |

## Prompt Templates

The package includes 7 prompt templates for common ADO workflows. They're automatically available after installing the package.

| Command | Description | Arguments |
|---------|-------------|----------|
| `/ado-triage` | Triage untriaged work items | Optional WIQL filter |
| `/ado-status-report` | Generate a status report | `state`, `assignee`, `iteration`, or `type` |
| `/ado-create-batch` | Batch-create work items | Bullet list of items |
| `/ado-review-history` | Review revision history | Work item ID |
| `/ado-sprint-health` | Sprint health check — burndown, capacity, at-risk items | Optional team name |
| `/ado-plan-sprint` | Sprint planning with capacity-based assignment | Sprint name or `next` |
| `/ado-board-review` | Board configuration analysis and suggestions | Board ID, optional team |

### Usage

Type `/ado-` in the prompt editor to see autocomplete suggestions. Each template expands into a step-by-step workflow that uses the ADO tools.

```bash
# Triage new bugs
/ado-triage AND [System.WorkItemType] = 'Bug'

# Status report grouped by assignee
/ado-status-report assignee

# Create multiple items at once
/ado-create-batch
- Bug: Fix payment timeout [priority:1, tags:payments;critical]
- Task: Write integration tests for checkout
- User Story: Add refund support

# Review what happened to work item #1234
/ado-review-history 1234
```

If you installed the package locally (e.g., `pi -e ./`), the templates are loaded from the `prompts/` directory as declared in `package.json`.

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
| `ADO_TEAM` | Default team name (for boards/iterations/capacity) |
| `ADO_MAX_QUERY_RESULTS` | Max query results (default: `100`) |

### Settings (`ado` key in `.pi/settings.json`)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `orgUrl` | string | — | Organization URL |
| `project` | string | — | Default project |
| `team` | string | — | Default team name |
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
