---
name: ado-workitems
description: Azure DevOps work item operations. Use when the user asks to create, read, update, query, comment on, or link work items. Covers WIQL queries, work item types, revisions, and safety model guidance.
---

# Azure DevOps Work Items

## Setup

Set these environment variables before use:

```bash
export ADO_ORG_URL="https://dev.azure.com/yourorg"
export ADO_PROJECT="YourProject"
export ADO_PAT="your-personal-access-token"
```

Or configure in `.pi/settings.json`:

```json
{
  "ado": {
    "orgUrl": "https://dev.azure.com/yourorg",
    "project": "YourProject",
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

### Write Tools (gated by safety level)

| Tool | Use When |
|------|----------|
| `ado_create_work_item` | User wants to create a new work item |
| `ado_update_work_item` | User wants to change fields on an existing work item |
| `ado_add_work_item_comment` | User wants to add a comment to a work item |
| `ado_manage_work_item_links` | User wants to create or remove links between work items |

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

## Error Handling

| Situation | Action |
|-----------|--------|
| "Authentication failed" | Check `ADO_PAT` or run `az login`. Use `ado_doctor` to diagnose. |
| "Project not found" | Verify `ADO_PROJECT` matches exactly (case-sensitive). |
| "Invalid work item type" | Use `ado_list_work_item_types` to see valid types. |
| "Work item not found" | Check the ID. Use `ado_query_work_items` to search. |
| "Rate limited" | Wait a moment and retry. Reduce query result counts. |
