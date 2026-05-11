---
name: ado-workitems
description: Azure DevOps work item and board operations. Use when the user asks to create, read, update, query, comment on, or link work items, or when they ask about boards, sprints, iterations, team capacity, or backlog management. Covers WIQL queries, work item types, revisions, boards, sprints, capacity, and safety model guidance.
---

# Azure DevOps Work Items & Boards

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

## Error Handling

| Situation | Action |
|-----------|--------|
| "Authentication failed" | Check `ADO_PAT` or run `az login`. Use `ado_doctor` to diagnose. |
| "Project not found" | Verify `ADO_PROJECT` matches exactly (case-sensitive). |
| "Invalid work item type" | Use `ado_list_work_item_types` to see valid types. |
| "Work item not found" | Check the ID. Use `ado_query_work_items` to search. |
| "No team specified" | Set `ADO_TEAM` env var, `ado.team` in settings, or pass `team` parameter. |
| "Rate limited" | Wait a moment and retry. Reduce query result counts. |
