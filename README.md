# @jwayong/pi-azure-devops

Azure DevOps integration for [Pi coding agent](https://github.com/earendil-works/pi-mono) — work items, pipelines, repos, test plans, and more.

## Features

- **52 tools** — work items, boards, sprints, repos, pull requests, pipelines, test plans, and more
- **Dual auth** — PAT (`ADO_PAT`) or Azure CLI (`az`) with auto-detect
- **Dual config** — environment variables or `.pi/settings.json`
- **Safety model** — `open` / `confirm` / `readonly` (default: `confirm`)
- **Mock mode** — work offline with fixture data (`ADO_MOCK=1`)
- **Autocomplete** — `#1234` work item ID completion
- **Skill** — `ado-workitems` with WIQL, board, sprint, capacity, and pipeline reference
- **13 prompt templates** — triage, status reports, batch create, review history, sprint health, sprint planning, board review, PR review, PR creator, pipeline status, deploy, test status, test runner
- **~870 tests** — comprehensive coverage, all offline

### What's Included

| Area | Tools | Read | Write |
|------|-------|------|-------|
| Work Items | CRUD, comments, links, revisions, WIQL queries | 6 | 4 |
| Teams | List teams | 1 | — |
| Boards | List boards, get/set board columns | 2 | 1 |
| Sprints | List iterations, get/set sprint assignments | 2 | 1 |
| Capacity | Get/set team member capacity | 1 | 1 |
| Repos | List/get repos, list branches | 3 | — |
| Pull Requests | List/get PRs, threads, commits, create/update, comment, vote | 4 | 4 |
| Policies | List policies, get evaluations | 2 | — |
| Pipelines | List/get pipelines, list/get runs, artifacts, logs, timeline, run/cancel/retry | 7 | 3 |
| Test Plans | List/get plans, suites, cases, points, runs; create runs, update results | 8 | 2 |
| Config | Doctor (health check) | 1 | — |

## Quick Start

### 1. Install the package

```bash
pi install npm:@jwayong/pi-azure-devops
```

Or try without installing:

```bash
pi -e npm:@jwayong/pi-azure-devops
```

### 2. Configure Azure DevOps access

Set environment variables in your shell (add to `~/.bashrc`, `~/.zshrc`, etc.):

```bash
export ADO_ORG_URL="https://dev.azure.com/myorg"
export ADO_PROJECT="MyProject"
export ADO_PAT="your-personal-access-token"
```

Or add to your project's `.pi/settings.json`:

```jsonc
{
  "ado": {
    "orgUrl": "https://dev.azure.com/myorg",
    "project": "MyProject",
    "pat": "your-personal-access-token",
    "safetyLevel": "confirm"
  }
}
```

**PAT setup:** Go to Azure DevOps → User Settings → Personal Access Tokens → New Token. Grant `Read` and `Work Items` scopes (add more scopes as needed for repos, pipelines, test plans).

### 3. Verify connection

Start a Pi session and ask it to run the doctor tool:

```
$ pi
> Run ado_doctor to check my ADO setup
```

`ado_doctor` verifies your configuration, authentication, and connection to Azure DevOps. If everything is working, you'll see a healthy report.

### 4. Use it

All ADO tools are available as natural language requests inside Pi:

```
> Query all active bugs assigned to me
> Create a user story titled "Implement login page" with description "..."
> Update work item #1234 state to Closed
> List all pipelines in the project
> What's the status of test run #501?
> Show me the sprint health for the Engineering team
```

### 5. Use prompt templates

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
| `/ado-pipeline-status [pipeline-id]` | Pipeline health check — recent runs, failure analysis |
| `/ado-deploy <pipeline-id> [branch]` | Deployment pipeline with pre-deploy safety checks |
| `/ado-test-status [run-id]` | Test run status report — pass/fail rates, failure analysis |
| `/ado-test-runner [plan-id]` | Create and manage a test run — select plan/suite, record results |

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
| `ado_list_repos` | List repositories in the project |
| `ado_get_repo` | Get repository detail by ID or name |
| `ado_list_branches` | List branches for a repository |
| `ado_list_pull_requests` | List pull requests with optional filters |
| `ado_get_pull_request` | Get pull request detail |
| `ado_get_pull_request_threads` | Get comment threads on a pull request |
| `ado_get_pull_request_commits` | Get commits in a pull request |
| `ado_list_policies` | List policy configurations |
| `ado_get_policy_evaluations` | Get policy evaluation status for a PR |
| `ado_list_pipelines` | List YAML pipelines in the project |
| `ado_get_pipeline` | Get pipeline detail by ID (YAML path, repo, folder) |
| `ado_list_runs` | List pipeline runs with optional filters (pipeline, status, result, branch) |
| `ado_get_run` | Get a single pipeline run detail |
| `ado_get_run_artifacts` | Get artifacts produced by a pipeline run |
| `ado_get_run_logs` | Get log entries for a pipeline run |
| `ado_get_run_timeline` | Get stages/jobs/tasks timeline for a pipeline run |
| `ado_list_test_plans` | List test plans in the project |
| `ado_get_test_plan` | Get test plan detail by ID |
| `ado_list_test_suites` | List test suites in a plan |
| `ado_get_test_suite` | Get test suite detail by ID |
| `ado_list_test_cases` | List test cases in a suite |
| `ado_list_test_points` | List test points with execution status |
| `ado_list_test_runs` | List test runs with optional filters |
| `ado_get_test_run` | Get test run detail with statistics |

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
| `ado_create_pull_request` | Create a new pull request |
| `ado_update_pull_request` | Update title, description, or status of a PR |
| `ado_add_pull_request_comment` | Add a comment to a PR thread |
| `ado_set_pull_request_vote` | Set vote on a PR (approve, reject, etc.) |
| `ado_run_pipeline` | Queue/trigger a pipeline run |
| `ado_cancel_run` | Cancel an in-progress pipeline run |
| `ado_retry_run` | Retry a failed pipeline run |
| `ado_create_test_run` | Create a test run from plan + suites |
| `ado_update_test_results` | Update test case outcomes in a run |

## Prompt Templates

The package includes 13 prompt templates for common ADO workflows. They're automatically available after installing the package.

| Command | Description | Arguments |
|---------|-------------|----------|
| `/ado-triage` | Triage untriaged work items | Optional WIQL filter |
| `/ado-status-report` | Generate a status report | `state`, `assignee`, `iteration`, or `type` |
| `/ado-create-batch` | Batch-create work items | Bullet list of items |
| `/ado-review-history` | Review revision history | Work item ID |
| `/ado-sprint-health` | Sprint health check — burndown, capacity, at-risk items | Optional team name |
| `/ado-plan-sprint` | Sprint planning with capacity-based assignment | Sprint name or `next` |
| `/ado-board-review` | Board configuration analysis and suggestions | Board ID, optional team |
| `/ado-pr-review` | Review a PR — threads, policies, changes summary | PR ID, optional repository ID |
| `/ado-pipeline-status` | Pipeline health check — recent runs, failures, duration trends | Optional pipeline ID |
| `/ado-deploy` | Run a deployment pipeline with pre-deploy safety checks | Pipeline ID, optional branch/params |
| `/ado-pr-creator` | Create a PR — suggest title/description from branch context | Repository ID, source branch |
| `/ado-test-status` | Test run status report — pass/fail rates, failure details | Optional run ID |
| `/ado-test-runner` | Create and manage a test run — guided workflow | Optional plan ID |

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

# Review pull request #42
/ado-pr-review 42

# Create a PR from feature branch
/ado-pr-creator repo-webapp feature/login

# Check pipeline health
/ado-pipeline-status 1

# Deploy with safety checks
/ado-deploy 2 release/v2

# Check test run status
/ado-test-status 501

# Create and manage a test run
/ado-test-runner 101
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
