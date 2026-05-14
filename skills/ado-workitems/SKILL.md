---
name: ado-workitems
description: Azure DevOps work item, board, repo, pull request, and pipeline operations. Use when the user asks to create, read, update, query, comment on, or link work items, or when they ask about boards, sprints, iterations, team capacity, backlog management, repositories, branches, pull requests, code reviews, policies, pipelines, builds, runs, artifacts, logs, or CI/CD. Covers WIQL queries, work item types, revisions, boards, sprints, capacity, Git repos, PR workflows, voting, policy evaluations, YAML pipelines, build runs, artifacts, and timeline.
---

# Azure DevOps Work Items, Boards, Pull Requests, & Pipelines

## Setup

Set these environment variables before use:

```bash
export ADO_ORG_URL="https://dev.azure.com/yourorg"
export ADO_PROJECT="YourProject"
export ADO_PAT="your-personal-access-token"
export ADO_TEAM="Engineering"        # optional — needed for boards/iterations/capacity
```

Or configure in `.pi/settings.json`:

```json
{
  "ado": {
    "orgUrl": "https://dev.azure.com/yourorg",
    "project": "YourProject",
    "team": "Engineering",
    "authMethod": "pat",
    "safetyLevel": "confirm"
  }
}
```

Run `ado_doctor` first to verify your configuration.

## Available Tools

### Read Tools (always allowed)

| Tool | Use When |
|------|----------|
| `ado_doctor` | User needs to check config, auth, or connection health |
| `ado_get_work_item` | User mentions a specific work item by ID (e.g., "#101") |
| `ado_query_work_items` | User wants to search, filter, or list work items by criteria |
| `ado_list_work_item_types` | User needs to know valid work item types before creating one |
| `ado_get_work_item_comments` | User wants to see discussion/comments on a work item |
| `ado_get_work_item_revisions` | User wants to see change history for a work item |
| `ado_list_teams` | User needs to discover which teams exist in the project |
| `ado_list_boards` | User wants to see boards for a team (Stories, Features, Epics) |
| `ado_get_board` | User wants to inspect board columns, state mappings, and WIP limits |
| `ado_list_iterations` | User wants to see sprints/iterations for a team, or find the current sprint |
| `ado_get_iteration_work_items` | User wants to see what work items are in a sprint |
| `ado_get_capacity` | User wants to see team member capacity and activities for a sprint |
| `ado_list_repos` | User wants to see repositories in the project |
| `ado_get_repo` | User wants details of a specific repository |
| `ado_list_branches` | User wants to see branches in a repository |
| `ado_list_pull_requests` | User wants to search or list pull requests (active, completed, abandoned) |
| `ado_get_pull_request` | User wants full details of a specific PR (description, reviewers, votes) |
| `ado_get_pull_request_threads` | User wants to see comments/discussion on a PR |
| `ado_get_pull_request_commits` | User wants to see commits in a PR |
| `ado_list_policies` | User wants to see branch/PR policies configured for the project |
| `ado_get_policy_evaluations` | User wants to check if PR policies are passing (approved/pending/rejected) |
| `ado_list_pipelines` | User wants to discover YAML pipelines in the project |
| `ado_get_pipeline` | User wants detail of a specific pipeline (YAML path, repo, folder) |
| `ado_list_runs` | User wants to see pipeline runs (builds) — filter by pipeline, status, result, branch |
| `ado_get_run` | User wants detail of a specific pipeline run |
| `ado_get_run_artifacts` | User wants to see artifacts produced by a build |
| `ado_get_run_logs` | User wants to see build log entries |
| `ado_get_run_timeline` | User wants to see stages/jobs/tasks timeline for a build |

### Write Tools (gated by safety level)

| Tool | Use When |
|------|----------|
| `ado_create_work_item` | User wants to create a new work item |
| `ado_update_work_item` | User wants to change fields on an existing work item |
| `ado_add_work_item_comment` | User wants to add a comment to a work item |
| `ado_manage_work_item_links` | User wants to create or remove links between work items |
| `ado_set_board_columns` | User wants to reconfigure board columns (rename, reorder, change WIP limits) |
| `ado_set_iteration` | User wants to add or remove a sprint from a team |
| `ado_set_capacity` | User wants to set team member capacity for a sprint |
| `ado_create_pull_request` | User wants to create a new pull request |
| `ado_update_pull_request` | User wants to change PR title, description, or status (abandon/complete) |
| `ado_add_pull_request_comment` | User wants to add a comment on a PR |
| `ado_set_pull_request_vote` | User wants to approve, reject, or vote on a PR |
| `ado_run_pipeline` | User wants to queue/trigger a pipeline run |
| `ado_cancel_run` | User wants to cancel an in-progress pipeline run |
| `ado_retry_run` | User wants to retry a failed pipeline run |

## Team Context

Most board, iteration, and capacity tools require a **team name**. The `team` parameter is optional on all these tools — they fall back to the configured default team (`ADO_TEAM` or `ado.team`).

**Workflow:**
1. If the user mentions a team by name, pass it as the `team` parameter.
2. If no team is mentioned, use the config default (no `team` param needed).
3. If no team is configured and none is specified, the tool returns an error — tell the user to set `ADO_TEAM` or specify a team.
4. Use `ado_list_teams` to discover available teams when unsure.

**Multi-team scenarios:** When working across teams (e.g., comparing sprint health), call tools once per team, passing each team name as the `team` parameter.

## WIQL Query Reference

### Basic Syntax

```sql
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.State] = 'Active'
ORDER BY [System.CreatedDate] DESC
```

### Common Where Clauses

| Filter | Example |
|--------|---------|
| By state | `WHERE [System.State] = 'Active'` |
| By type | `WHERE [System.WorkItemType] = 'Bug'` |
| By assignee | `WHERE [System.AssignedTo] = @me` |
| By area | `WHERE [System.AreaPath] UNDER 'Project\Engineering'` |
| By iteration | `WHERE [System.IterationPath] UNDER 'Project\Sprint 4'` |
| By tags | `WHERE [System.Tags] CONTAINS 'security'` |
| Multiple conditions | `WHERE [System.State] = 'Active' AND [System.WorkItemType] = 'Bug'` |

### Useful Queries

Active bugs assigned to me:
```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.WorkItemType] = 'Bug'
  AND [System.State] = 'Active'
  AND [System.AssignedTo] = @me
```

All items in current sprint:
```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.IterationPath] UNDER 'Project\Sprint 4'
  AND [System.State] <> 'Closed'
ORDER BY [System.Priority]
```

Unassigned active items:
```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.State] = 'Active'
  AND [System.AssignedTo] = ''
```

Recently changed items:
```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.ChangedDate] >= @today - 7
ORDER BY [System.ChangedDate] DESC
```

## Sprint/Iteration Reference

### Finding Sprints

Use `ado_list_iterations` to discover sprints. Pass `timeframe: "current"` to get the active sprint:

```
ado_list_iterations(team: "Engineering", timeframe: "current")
```

**Timeframe values:** `"current"`, `"past"`, `"future"`

### Iteration Data

Each iteration returns:
- **id** — GUID (needed for capacity and iteration work item tools)
- **name** — Sprint name (e.g., "Sprint 3")
- **path** — Full path (e.g., `Project\Sprint 3`)
- **attributes.startDate / finishDate** — Sprint date range
- **attributes.timeFrame** — `"current"`, `"past"`, or `"future"`

### Common Sprint Operations

| Task | Steps |
|------|-------|
| Show current sprint items | `ado_list_iterations(timeframe: "current")` → get iteration ID → `ado_get_iteration_work_items(iterationId)` |
| Check capacity | `ado_get_capacity(iterationId, team)` |
| Add a sprint to team | `ado_set_iteration(iterationId, operation: "add", team)` |
| Remove a sprint | `ado_set_iteration(iterationId, operation: "remove", team)` |

### Typical Iteration Patterns

Iterations follow the project's area path structure:
- `Project\Sprint 1`, `Project\Sprint 2`, ...
- `Project\2026-Q1\Sprint 1`, `Project\2026-Q2\Sprint 1`, ...

## Board Reference

### Board Types

| Board ID | Backlog Level | Typical Work Item Types |
|----------|--------------|------------------------|
| `stories` | Requirements | User Story, Bug, Task |
| `features` | Features | Feature |
| `epics` | Epics | Epic |

Teams may have custom boards with different IDs. Use `ado_list_boards(team)` to discover them.

### Column Configuration

Each board has columns with:
- **name** — Display name (e.g., "New", "Active", "Closed")
- **columnType** — `Incoming` (first), `InProgress` (middle), `Outgoing` (last)
- **itemLimit** — WIP limit (null = unlimited)
- **stateMappings** — Maps work item type → state for this column

Example state mappings for a "Stories" board:
```
Column "New":   { "User Story": "New", "Bug": "New", "Task": "To Do" }
Column "Active": { "User Story": "Active", "Bug": "Active", "Task": "In Progress" }
Column "Closed": { "User Story": "Closed", "Bug": "Closed", "Task": "Closed" }
```

### Modifying Board Columns

`ado_set_board_columns` **replaces all columns** — always `ado_get_board` first to see the current config, then modify.

**Workflow:**
1. `ado_get_board(boardId, team)` — inspect current columns and state mappings
2. Modify the column definitions as needed
3. `ado_set_board_columns(boardId, columns, team)` — apply the new set

## Capacity Reference

### Capacity Model

Each team member has:
- **Activities** — Work categories with hours/day (e.g., Development: 6h/day, Code Review: 1h/day)
- **Days off** — Date ranges when the member is unavailable

Team totals are computed automatically (sum of all member capacity minus days off).

### Reading Capacity

```
ado_get_capacity(iterationId, team)
```

Returns per-member breakdown with activities, days off, and team totals.

### Setting Capacity

`ado_set_capacity` **replaces all capacity** for the sprint — always `ado_get_capacity` first to see current values.

**Workflow:**
1. `ado_get_capacity(iterationId, team)` — see current values
2. Build the new capacity array (one entry per team member)
3. `ado_set_capacity(iterationId, capacities, team)` — apply

Each capacity entry:
```json
{
  "teamMemberId": "user@contoso.com",
  "activities": [
    { "name": "Development", "capacityPerDay": 6 },
    { "name": "Code Review", "capacityPerDay": 1 }
  ],
  "daysOff": [
    { "start": "2026-04-25T00:00:00Z", "end": "2026-04-25T00:00:00Z" }
  ]
}
```

### Common Activities

| Activity | Typical For |
|----------|------------|
| Development | Developers — writing code |
| Testing | QA — manual and automated testing |
| Code Review | Senior developers — reviewing PRs |
| Design | Designers — UX/UI work |
| Infrastructure | DevOps — CI/CD, cloud |
| Documentation | Technical writers — docs |

## Common Field Reference

| Field | Reference Name | Example Values |
|-------|---------------|----------------|
| Title | `System.Title` | Any text |
| State | `System.State` | New, Active, Resolved, Closed, Done |
| Type | `System.WorkItemType` | User Story, Bug, Task, Feature, Epic |
| Assigned To | `System.AssignedTo` | Email or display name, `@me` in WIQL |
| Area Path | `System.AreaPath` | `Project\Area\SubArea` |
| Iteration | `System.IterationPath` | `Project\Sprint 4` |
| Priority | `System.Priority` | 1 (highest) – 4 (lowest) |
| Reason | `System.Reason` | New, Implementation started, Completed, Fixed, Deferred |
| Tags | `System.Tags` | Semicolon-separated: `security; backend` |
| Description | `System.Description` | HTML content |
| Severity | `Microsoft.VSTS.Common.Severity` | 1 - Critical, 2 - High, 3 - Medium, 4 - Low |
| Value Area | `Microsoft.VSTS.Common.ValueArea` | Business, Architectural |
| Created Date | `System.CreatedDate` | ISO 8601 date |
| Changed Date | `System.ChangedDate` | ISO 8601 date |

## Work Item Type Conventions

| Type | Purpose | Typical States |
|------|---------|---------------|
| **Epic** | Large initiative spanning features | New → In Progress → Done |
| **Feature** | Group of user stories | New → In Progress → Done |
| **User Story** | User-valued deliverable | New → Active → Resolved → Closed |
| **Bug** | Deviation from expected behavior | New → Active → Resolved → Closed |
| **Task** | Implementation work item | To Do → In Progress → Done |
| **Issue** | Impediment or blocking problem | Active → Closed |

## Link Types

| Relation Type | Usage |
|---------------|-------|
| `System.LinkTypes.Hierarchy-Forward` | Parent → Child (Epic→Feature, Feature→Story, Story→Task) |
| `System.LinkTypes.Hierarchy-Reverse` | Child → Parent |
| `System.LinkTypes.Related` | Related work items |
| `System.LinkTypes.Duplicate` | Duplicate work items |
| `System.LinkTypes.Duplicate-Reverse` | Original of a duplicate |
| `System.LinkTypes.Dependency` | Successor depends on predecessor |
| `System.LinkTypes.Dependency-Reverse` | Predecessor of a dependency |

## Safety Model

The safety level controls how mutation tools behave:

- **`open`** — No confirmation needed. Tools execute immediately.
- **`confirm`** (default) — User sees a confirmation dialog before each mutation.
- **`readonly`** — All mutation tools are blocked. Only read operations allowed.

Set via `ADO_SAFETY_LEVEL` env var or `ado.safetyLevel` in settings.

## Mock Mode

For testing without ADO credentials:

```bash
ADO_MOCK=1 pi "Show me work item #101"
```

Or pass `{ "mock": true }` to any tool's parameters.

## Best Practices

1. **Always run `ado_doctor` first** in a new session to verify configuration.
2. **Use `ado_list_work_item_types`** before creating work items to confirm valid types.
3. **Prefer WIQL queries** over multiple individual fetches when searching for work items.
4. **Set `System.Tags`** when creating to improve discoverability.
5. **Use `ado_get_work_item_revisions`** to understand the history before updating.
6. **Link parent/child items** using `ado_manage_work_item_links` to maintain hierarchy.
7. **Use `ado_list_iterations(timeframe: "current")`** instead of hardcoded sprint names — sprints change.
8. **Always `ado_get_board` before `ado_set_board_columns`** — the set operation replaces all columns.
9. **Always `ado_get_capacity` before `ado_set_capacity`** — the set operation replaces all capacity data.
10. **List boards before modifying** — use `ado_list_boards(team)` to find the correct board ID.
11. **Use `ado_list_repos` first** when working with PRs — you'll need the repository ID for most PR operations.
12. **Check `ado_get_pull_request_threads` before commenting** — review existing discussion to avoid duplicates.
13. **Check `ado_get_policy_evaluations` before approving** — verify all policies are passing.
14. **Use full ref names** (`refs/heads/feature/login`) when specifying source/target branches for PRs.
15. **Use `ado_list_pull_requests(status: "active")`** to find open PRs — don't guess PR IDs.
16. **Use `ado_list_pipelines` first** to find the pipeline ID before running or inspecting runs.
17. **Check `ado_get_run_timeline` for failed runs** to identify which stage/job/task failed.
18. **Use `ado_get_run_logs` to see detailed error messages** after identifying failing tasks.
19. **Use `ado_list_runs(status: "inProgress")`** to monitor currently active runs.
20. **Template parameters must match YAML parameter names exactly** — check the pipeline YAML definition.

## Repository Reference

### Identifying Repositories

Most repo/PR tools accept `repositoryId` which can be either:
- **Repository name** — e.g., `"webapp"`, `"api-service"` (human-friendly)
- **Repository GUID** — e.g., `"repo-webapp"` (stable across renames)

**Workflow:** Use `ado_list_repos` first to discover available repos, then use the name or ID for branch and PR operations.

### Branch Name Formats

The ADO API uses full ref names internally: `refs/heads/main`. Short names (`main`) are displayed in formatted output.

When passing `sourceRefName` or `targetRefName` to tools, always use the full ref format:
```
refs/heads/feature/login
refs/heads/hotfix/auth-fix
refs/heads/release/v2.0
```

### Common Branch Patterns

| Pattern | Purpose |
|---------|----------|
| `main` | Default branch (production) |
| `develop` | Integration branch |
| `feature/*` | New feature development |
| `hotfix/*` | Urgent production fixes |
| `release/*` | Release preparation |
| `bugfix/*` | Bug fixes (non-urgent) |

### Ahead/Behind Counts

Branches show `↑N ↓M` tracking info:
- `↑N` = N commits ahead of base
- `↓M` = M commits behind base
- `(base)` = this is the branch others track against

## Pull Request Reference

### PR Status Values

| Status | Description |
|--------|------------|
| `active` | Open and under review |
| `abandoned` | Closed without merging |
| `completed` | Successfully merged |

### PR Lifecycle

```
ado_create_pull_request → ado_get_pull_request_threads → review code →
ado_add_pull_request_comment → ado_set_pull_request_vote → (auto-complete or manual merge)
```

**Typical workflow:**
1. `ado_list_branches(repoId)` — see available branches
2. `ado_create_pull_request(repoId, source, target, title)` — create PR
3. `ado_get_pull_request_threads(repoId, prId)` — check existing discussion
4. `ado_add_pull_request_comment(repoId, prId, content)` — add feedback
5. `ado_set_pull_request_vote(repoId, prId, vote)` — approve or reject
6. `ado_get_policy_evaluations(prId)` — check if all policies pass

### Vote Values

| Vote String | Numeric | Meaning |
|-------------|---------|----------|
| `approve` | 10 | PR looks good, ready to merge |
| `approve-with-suggestions` | 5 | Approve, but consider minor changes |
| `waiting-for-author` | -5 | Changes needed before approval |
| `reject` | -10 | Should not merge |
| `reset` | 0 | Remove previous vote |

### PR Comment Threads

PR comments are organized into **threads**, each with a status:

| Status | Meaning |
|--------|----------|
| `active` (1) | Open for discussion |
| `fixed` (2) | Issue resolved |
| `wontfix` (3) | Won't be fixed |
| `closed` (4) | Thread closed |
| `pending` (6) | Awaiting response |

When adding a comment, you can set `threadStatus` to control the thread state.

### Draft PRs

Create a draft PR with `isDraft: true` to signal work-in-progress. Draft PRs cannot be merged until marked ready.

### Common PR Search Patterns

```
// All active PRs in the project
ado_list_pull_requests(status: "active")

// PRs created by a specific person
ado_list_pull_requests(creator: "alice@contoso.com", status: "active")

// PRs in a specific repo
ado_list_pull_requests(repositoryId: "webapp", status: "active")

// PRs targeting main
ado_list_pull_requests(targetRefName: "refs/heads/main", status: "active")

// Recently completed PRs
ado_list_pull_requests(status: "completed", top: 10)
```

## Policy Reference

### Common Policy Types

| Policy | Purpose |
|--------|----------|
| Minimum reviewers | Requires N approvals before merge |
| Build validation | CI pipeline must pass |
| Required reviewer | Specific team/person must review |
| Work item linking | PR must have linked work items |
| Comment requirements | All comments must be resolved |

### Policy Evaluation Status

| Status | Meaning |
|--------|----------|
| ✅ Approved | Policy satisfied |
| ⏳ Running | Evaluation in progress |
| ❌ Rejected | Policy not satisfied (blocking merge) |
| ➖ Not applicable | Policy doesn't apply to this PR |

**Workflow:** Check `ado_get_policy_evaluations(prId)` before approving/voting to see if any policies are blocking.

## Pipeline Reference

### Pipeline Identification

Pipelines are identified by numeric ID. Use `ado_list_pipelines` to discover pipelines and their IDs. Each pipeline has:
- **id** — Numeric pipeline ID (used by all pipeline tools)
- **name** — Display name (e.g., "CI Pipeline")
- **folder** — Folder path (e.g., `\deploy`)
- **configuration.path** — YAML file path (e.g., `azure-pipelines.yml`)
- **configuration.repository** — Source repository

### Run States

| State | Description |
|-------|------------|
| `completed` | Run finished (check result for success/failure) |
| `inProgress` | Run is currently executing |
| `cancelling` | Run is being cancelled |

### Run Results

| Result | Description |
|--------|------------|
| `succeeded` | All stages passed |
| `failed` | One or more stages failed |
| `canceled` | Run was cancelled before completion |
| `partiallySucceeded` | Some stages passed, some failed |

### Template Parameters

YAML pipelines can accept template parameters as key-value pairs:
```
ado_run_pipeline(pipelineId: 1, templateParameters: { "environment": "production", "region": "us-east" })
```

Parameter names must match the `parameters:` block in the YAML pipeline definition exactly.

### Timeline Hierarchy

Run timelines follow a Stage → Job → Task hierarchy:
- **Stage** — Top-level grouping (e.g., Build, Test, Deploy)
- **Job** — Execution unit within a stage (runs on an agent)
- **Task** — Individual step within a job (e.g., npm install, npm test)

Use `ado_get_run_timeline` to inspect which stage/job/task failed.

## Error Handling

| Situation | Action |
|-----------|--------|
| "Authentication failed" | Check `ADO_PAT` or run `az login`. Use `ado_doctor` to diagnose. |
| "Project not found" | Verify `ADO_PROJECT` matches exactly (case-sensitive). |
| "Invalid work item type" | Use `ado_list_work_item_types` to see valid types. |
| "Work item not found" | Check the ID. Use `ado_query_work_items` to search. |
| "No team specified" | Set `ADO_TEAM` env var, `ado.team` in settings, or pass `team` parameter. |
| "Repository not found" | Use `ado_list_repos` to find the correct repository ID or name. |
| "PR not found" | Use `ado_list_pull_requests` to find the correct PR ID. |
| "Rate limited" | Wait a moment and retry. Reduce query result counts. |
| "Pipeline not found" | Use `ado_list_pipelines` to find the correct pipeline ID. |
| "Run not found" | Use `ado_list_runs` to find the correct run ID for the pipeline. |
| "Run is not in progress" | Can only cancel runs with state `inProgress`. Check the run state first. |
