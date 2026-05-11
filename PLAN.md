# PLAN: `pi-azure-devops` — Full Azure DevOps Integration for Pi

> A Pi package providing rich Azure DevOps integration, starting with work items and designed to grow into a comprehensive ADO integration (pipelines, repos, PRs, test plans, etc.).

## Status: Phase 3 In Progress (v0.3.0)

## Package

- **Name:** `@jwayong/pi-azure-devops`
- **Type:** Pi package (npm + git installable)
- **License:** MIT
- **Keywords:** `pi-package`, `azure-devops`
- **Repository:** `github.com/jwayong/pi-azure-devops`

## Design Principles

1. **Community-first** — publish as open source, designed for reuse and contribution
2. **Progressive scope** — work items first, then pipelines, repos, PRs, test plans
3. **Safe by default, configurable** — mutations gated by user-chosen safety level
4. **Dual auth** — PAT and Azure CLI, with clean fallback
5. **Dual config** — env vars for quick start, settings.json for structured per-project config
6. **Idiomatic Pi** — follows pi extension/skill/prompt conventions, uses typebox schemas, StringEnum for Google compat

---

## Phase 1: Work Items

### Tools

| Tool | Description | Mutation |
|------|-------------|----------|
| `ado_doctor` | Check config, auth readiness, and connection health | Read |
| `ado_get_work_item` | Fetch a single work item by ID with all fields | Read |
| `ado_query_work_items` | Run a WIQL query to find work items | Read |
| `ado_create_work_item` | Create a new work item (type, title, description, custom fields) | Write |
| `ado_update_work_item` | Update fields on an existing work item (JSON patch) | Write |
| `ado_add_work_item_comment` | Add a comment to a work item | Write |
| `ado_get_work_item_comments` | Retrieve comments on a work item | Read |
| `ado_manage_work_item_links` | Add/remove relation links between work items | Write |
| `ado_get_work_item_revisions` | Get revision history for a work item | Read |
| `ado_list_work_item_types` | List available work item types for the project | Read |

### Skill

`skills/ado-workitems/SKILL.md` — operating rules for the LLM:
- When to use each tool
- WIQL query syntax reference and examples
- Common field names (System.Title, System.State, System.AssignedTo, etc.)
- Work item type conventions (User Story, Bug, Task, etc.)
- Link types (System.LinkTypes.Hierarchy-Forward, etc.)
- Error handling guidance (permissions, invalid WIQL, not found)

### Prompt Templates

| Template | Description |
|----------|-------------|
| `ado-triage` | Triage a batch of work items — set priority, area, iteration, assign |
| `ado-status-report` | Summarize work items by state, assigned to, or iteration |
| `ado-create-batch` | Create multiple work items from a structured description |
| `ado-review-history` | Review revision history and summarize changes |

### Autocomplete

`#<id>` work item completion in the editor — preloads recent/assigned work items on session start, fuzzy filters on type. Pattern follows `github-issue-autocomplete.ts` from pi examples.

### Configuration

#### Environment Variables (quick start)

| Variable | Required | Description |
|----------|----------|-------------|
| `ADO_ORG_URL` | Yes | Organization URL, e.g. `https://dev.azure.com/myorg` |
| `ADO_PROJECT` | Yes | Default project name |
| `ADO_PAT` | If using PAT auth | Personal Access Token |
| `ADO_AUTH_METHOD` | No | `pat` or `azure-cli`. Default: auto-detect |

#### Settings (`.pi/settings.json` or `~/.pi/agent/settings.json`)

```jsonc
{
  "ado": {
    "orgUrl": "https://dev.azure.com/myorg",
    "project": "MyProject",
    "authMethod": "pat",           // "pat" | "azure-cli" | "auto"
    "defaultWorkItemType": "User Story",
    "safetyLevel": "confirm",      // "open" | "confirm" | "readonly"
    "maxQueryResults": 100,
    "autocomplete": true
  }
}
```

**Precedence:** env vars → settings.json → defaults

### Authentication

#### PAT (Personal Access Token)

- Read from `ADO_PAT` env var
- Used via `getPersonalAccessTokenHandler()` from `azure-devops-node-api`
- Simplest setup, works everywhere

#### Azure CLI (`az`)

- Runs `az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798` to get an Entra ID token
- Supports managed identity, service principals, browser login
- Token cached and refreshed automatically
- Fallback: if `az` not found, falls back to PAT

#### Auto-detect logic

1. If `ADO_AUTH_METHOD=pat` or `ADO_PAT` is set → use PAT
2. If `ADO_AUTH_METHOD=azure-cli` or `az` is available → use Azure CLI
3. If `ADO_PAT` is set and `az` is also available → prefer PAT (explicit wins)
4. Default: try Azure CLI first, fall back to PAT

### Safety Model

Three levels, configurable via `safetyLevel` in settings or `ADO_SAFETY_LEVEL` env var:

| Level | Behavior |
|-------|----------|
| `open` | No confirmation. LLM can create, update, comment, link freely. |
| `confirm` (default) | User confirmation dialog before each mutation tool call. Shows operation summary (e.g., "Create Bug: 'Fix login crash' in MyProject"). User can approve or reject. |
| `readonly` | Mutation tools (`ado_create_work_item`, `ado_update_work_item`, `ado_add_work_item_comment`, `ado_manage_work_item_links`) are blocked entirely. |

Implementation:
- Use the `tool_call` event to intercept mutations
- Check the resolved safety level
- For `confirm`: use `ctx.ui.confirm()` with a summary of the operation
- For `readonly`: return `{ block: true, reason: "..." }`
- Confirmation dialog shows the operation type, target, and fields being changed

---

### Mock Mode

All tools support a `mock` option (parameter or env var `ADO_MOCK=1`) that returns realistic fixture data without making network calls. Uses the same response formatting as live mode.

- Fixtures live in `src/mocks/fixtures/` as JSON files (work items, queries, comments, etc.)
- Mock mode is activated per-tool via `{ mock: true }` parameter, or globally via `ADO_MOCK=1` env var
- `ado_doctor` in mock mode reports config as resolved and auth as ready without validating credentials
- Useful for: development, CI, testing prompt templates, and demonstrating the package without ADO credentials

## Future Phases

### Phase 2: Pipelines (Builds & Releases)

- `ado_list_pipelines`, `ado_list_builds`, `ado_get_build`, `ado_get_build_logs`
- `ado_queue_build`, `ado_cancel_build`
- Build timeline, artifacts, diagnostics
- May absorb/incorporate patterns from `@rxreyn3/pi-azure-devops`

### Phase 3: Repos & Pull Requests

#### Goal

Add tools for Git repositories and pull requests. Users can browse repos, list/search PRs, review PR details, manage comments, vote, and view commits. The phase also covers branch listing and basic file content retrieval.

#### API Client

Uses `IGitApi` from `azure-devops-node-api/GitApi.js`. Access via `connection.getGitApi()`. All methods take `project?: string` as the last parameter.

No new config fields needed — repos and PRs use the existing `ADO_ORG_URL` and `ADO_PROJECT`. `repositoryId` is always passed as a parameter (not configured).

#### Tools

| # | Tool | Description | Mutation | API Method |
|---|------|-------------|----------|------------|
| 1 | `ado_list_repos` | List Git repositories in the project | No | `getRepositories(project)` |
| 2 | `ado_get_repo` | Get a single repository by ID or name | No | `getRepository(repositoryId, project)` |
| 3 | `ado_list_branches` | List branches in a repository | No | `getBranches(repositoryId, project)` |
| 4 | `ado_list_pull_requests` | List/search pull requests by status, creator, reviewer | No | `getPullRequests(repositoryId, searchCriteria, project)` or `getPullRequestsByProject(project, searchCriteria)` |
| 5 | `ado_get_pull_request` | Get PR detail — title, description, status, reviewers, merge status | No | `getPullRequest(repositoryId, pullRequestId, project)` or `getPullRequestById(pullRequestId, project)` |
| 6 | `ado_get_pull_request_threads` | Get comment threads on a PR | No | `getThreads(repositoryId, pullRequestId, project)` |
| 7 | `ado_get_pull_request_commits` | Get commits in a PR | No | `getPullRequestCommits(repositoryId, pullRequestId, project)` |
| 8 | `ado_create_pull_request` | Create a new PR (source/target branch, title, description) | Yes | `createPullRequest(gitPullRequestToCreate, repositoryId, project)` |
| 9 | `ado_update_pull_request` | Update PR fields (title, description, status: abandon/complete/reactivate) | Yes | `updatePullRequest(gitPullRequestToUpdate, repositoryId, pullRequestId, project)` |
| 10 | `ado_add_pull_request_comment` | Add a comment thread to a PR | Yes | `createThread(commentThread, repositoryId, pullRequestId, project)` |
| 11 | `ado_set_pull_request_vote` | Vote on a PR (approve, approve-with-suggestions, wait, reject) | Yes | `createPullRequestReviewer(reviewer, repositoryId, pullRequestId, reviewerId, project)` |
| 12 | `ado_list_policies` | List branch/PR policies for the project | No | `getPolicyConfigurations(project, scope)` |
| 13 | `ado_get_policy_evaluations` | Get policy evaluation status for a PR | No | `getPolicyEvaluations(project, artifactId)` |

#### Design Decisions

- **`repositoryId` is always a parameter, never configured.** Users often work across multiple repos. The tool requires `repositoryId` (GUID or name).
- **`getPullRequestsByProject` over `getPullRequests`.** When users search for PRs across repos, `getPullRequestsByProject` doesn't require a repo ID. For repo-scoped queries, pass `searchCriteria.repositoryId`.
- **`getPullRequestById` as fallback.** When user says "PR #42", use `getPullRequestById(42, project)` — works without repo ID.
- **Vote values:** 10 (approved), 5 (approved with suggestions), 0 (reset/no vote), -5 (waiting for author), -10 (rejected). Exposed as string enum: `"approve" | "approve-with-suggestions" | "waiting-for-author" | "reject" | "reset"`.
- **PR status enum:** `"active" | "abandoned" | "completed" | "all"`. Mapped to `GitInterfaces.PullRequestStatus`.
- **Comment threads, not individual comments.** ADO PR comments are organized into threads. `ado_add_pull_request_comment` creates a new thread with one comment. `ado_get_pull_request_threads` returns all threads with their comments.
- **Policy API uses `IPolicyApi`** from `azure-devops-node-api/PolicyApi.js`. Access via `connection.getPolicyApi()`. Policy evaluations use `artifactId` format: `vstfs:///CodeReview/CodeReviewId/{projectId}/{pullRequestId}`.
- **`ado_list_pull_requests` supports both repo-scoped and project-wide queries.** When `repositoryId` is provided, uses `getPullRequests`. When omitted, uses `getPullRequestsByProject`.
- **Branch listing returns name, commit, isBaseVersion, ahead/behind counts.** Useful for PR creation workflows.

#### Mock Fixtures

| File | Contents |
|------|----------|
| `repos.json` | 3 repos (webapp, api, shared-libs) with IDs, names, default branches, sizes |
| `branches.json` | 4 branches per repo (main, develop, feature/*, hotfix/*) |
| `pull-requests.json` | 5 PRs across repos — various statuses (active, completed, abandoned), reviewers, votes |
| `pr-detail.json` | Full PR detail with threads, commits, reviewers for PR #1 |
| `pr-threads.json` | 3 comment threads with comments |
| `pr-commits.json` | 3-5 commits per PR |
| `policies.json` | 3 policy configurations (minimum reviewers, build validation, required reviewers) |
| `policy-evaluations.json` | Policy evaluation records (approved, pending, rejected) |

#### Mock Handlers

| Handler | Returns |
|---------|----------|
| `mockListRepos()` | All repos |
| `mockGetRepo(repoId)` | Single repo or error |
| `mockListBranches(repoId)` | Branches for a repo |
| `mockListPullRequests(searchCriteria)` | Filtered PRs |
| `mockGetPullRequest(prId)` | Full PR detail |
| `mockGetPullRequestThreads(repoId, prId)` | Comment threads |
| `mockGetPullRequestCommits(repoId, prId)` | Commits |
| `mockCreatePullRequest(repoId, data)` | New PR |
| `mockUpdatePullRequest(repoId, prId, data)` | Updated PR |
| `mockAddPullRequestComment(repoId, prId, text)` | New thread |
| `mockSetPullRequestVote(repoId, prId, vote)` | Updated reviewer |
| `mockListPolicies(scope?)` | Policy configurations |
| `mockGetPolicyEvaluations(artifactId)` | Policy evaluations |

#### Formatting Functions

| Function | Output |
|----------|--------|
| `formatRepo(repo)` | Repo name, ID, default branch, size, URL |
| `formatRepoList(repos)` | Table: name, default branch, size |
| `formatBranch(branch)` | Branch name, commit (short), ahead/behind |
| `formatBranchList(branches)` | Compact list of branches |
| `formatPullRequest(pr)` | PR ID, title, status, author, source→target, reviewers with votes |
| `formatPullRequestList(prs)` | Table: ID, title, status, author, creation date |
| `formatPullRequestThread(thread)` | Thread status, comments with author/date |
| `formatCommit(commit)` | Commit SHA (short), author, message (first line), date |
| `formatCommitList(commits)` | Compact list of commits |
| `formatPolicy(policy)` | Policy type, scope, settings summary |
| `formatPolicyEvaluation(evaluation)` | Policy name, status (approved/pending/rejected) |

#### Safety Model Additions

New mutation tools registered in `MUTATION_TOOLS`:
- `ado_create_pull_request`
- `ado_update_pull_request`
- `ado_add_pull_request_comment`
- `ado_set_pull_request_vote`

New `formatMutationSummary` cases:
- `ado_create_pull_request`: `"Create PR: '{title}' ({source} → {target})"`
- `ado_update_pull_request`: `"Update PR #{id}: {fields changed}"`
- `ado_add_pull_request_comment`: `"Comment on PR #{id}: {text truncated}"`
- `ado_set_pull_request_vote`: `"Vote on PR #{id}: {vote}"`

#### Connection Extensions

Add `getGitApi()` and `getPolicyApi()` to `src/utils/connection.ts`:

```typescript
export async function getGitApi(config: AdoConfig, signal?: AbortSignal) {
  const connection = await getConnection(config, signal);
  return connection.getGitApi();
}

export async function getPolicyApi(config: AdoConfig, signal?: AbortSignal) {
  const connection = await getConnection(config, signal);
  return connection.getPolicyApi();
}
```

#### Skill Updates

Add to `skills/ado-workitems/SKILL.md`:
- PR status reference (active, abandoned, completed)
- Vote values reference
- PR workflow guidance (list → review → comment → vote)
- Branch naming patterns
- Policy evaluation interpretation
- Common PR search criteria examples

#### New Prompt Templates

| Template | Description |
|----------|------------|
| `ado-pr-review` | Review a PR — read threads, check policies, summarize changes |
| `ado-pr-creator` | Create a PR — list branches, suggest title/description from commits |

#### Autocomplete Extensions

Add `!<id>` PR ID autocomplete:
- Preload active PRs for the project on session_start
- `!42` triggers fuzzy-filter on PR ID and title
- Shows PR status badge in suggestion

Or: skip if not adding clear value over text. Evaluate after core tools.

#### Implementation Order

| Issue | Title | Depends On | Est. Tests |
|-------|-------|------------|------------|
| #36 | Connection + config extensions | — | 5 |
| #37 | Mock fixtures + handlers | #36 | 25 |
| #38 | Read tools (7) | #36, #37 | 20 |
| #39 | Write tools (4) | #36, #37 | 15 |
| #40 | Formatting functions | #37 | 15 |
| #41 | Safety model extensions | #39 | 5 |
| #42 | Skill + prompt templates | #38, #39 | — |
| #43 | Comprehensive test suite | #36–#41 | 30 |
| #44 | README/docs + publish v0.3.0 | #42, #43 | — |

**Total estimated tests: ~115 new (368 → ~483)**

#### API Method Signatures

```typescript
// Repos
getRepositories(project?: string, includeLinks?: boolean, includeAllUrls?: boolean, includeHidden?: boolean): Promise<GitRepository[]>
getRepository(repositoryId: string, project?: string): Promise<GitRepository>

// Branches
getBranches(repositoryId: string, project?: string, baseVersionDescriptor?: GitVersionDescriptor): Promise<GitBranchStats[]>

// Pull Requests
getPullRequests(repositoryId: string, searchCriteria: GitPullRequestSearchCriteria, project?: string, maxCommentLength?: number, skip?: number, top?: number): Promise<GitPullRequest[]>
getPullRequestsByProject(project: string, searchCriteria: GitPullRequestSearchCriteria, maxCommentLength?: number, skip?: number, top?: number): Promise<GitPullRequest[]>
getPullRequest(repositoryId: string, pullRequestId: number, project?: string, ...): Promise<GitPullRequest>
getPullRequestById(pullRequestId: number, project?: string): Promise<GitPullRequest>

// PR Comments
getThreads(repositoryId: string, pullRequestId: number, project?: string, ...): Promise<GitPullRequestCommentThread[]>
createThread(commentThread: GitPullRequestCommentThread, repositoryId: string, pullRequestId: number, project?: string): Promise<GitPullRequestCommentThread>

// PR Commits
getPullRequestCommits(repositoryId: string, pullRequestId: number, project?: string): Promise<PagedList<GitCommitRef>>

// PR Create/Update
createPullRequest(gitPullRequestToCreate: GitPullRequest, repositoryId: string, project?: string, supportsIterations?: boolean): Promise<GitPullRequest>
updatePullRequest(gitPullRequestToUpdate: GitPullRequest, repositoryId: string, pullRequestId: number, project?: string): Promise<GitPullRequest>

// PR Vote
createPullRequestReviewer(reviewer: IdentityRefWithVote, repositoryId: string, pullRequestId: number, reviewerId: string, project?: string): Promise<IdentityRefWithVote>

// Policies (IPolicyApi)
getPolicyConfigurations(project: string, scope?: string, policyType?: string): Promise<PagedList<PolicyConfiguration>>
getPolicyEvaluations(project: string, artifactId: string, includeNotApplicable?: boolean, top?: number, skip?: number): Promise<PolicyEvaluationRecord[]>
```

#### Type Inference Pattern

Follow Phase 5 convention — infer types from API methods:

```typescript
type GitRepository = Awaited<ReturnType<IGitApi["getRepository"]>>;
type GitPullRequest = Awaited<ReturnType<IGitApi["getPullRequestById"]>>;
type GitBranchStats = Awaited<ReturnType<IGitApi["getBranches"]>>[number];
type GitPullRequestCommentThread = Awaited<ReturnType<IGitApi["getThreads"]>>[number];
type GitCommitRef = Awaited<ReturnType<IGitApi["getPullRequestCommits"]>>[number];
```

### Phase 4: Test Plans

- `ado_list_test_plans`, `ado_list_test_suites`, `ado_list_test_cases`
- `ado_create_test_run`, `ado_update_test_results`

### Phase 5: Boards & Backlogs ✅ (v0.2.0)

- 9 tools: list teams, list/get boards, set board columns, list iterations, get/set iteration work items, get/set capacity
- Team configuration: `ADO_TEAM` env var, `ado.team` setting, per-tool override
- 3 prompt templates: sprint health, sprint planning, board review
- 338 tests total
- Full mock mode coverage

---

## Project Structure

```
pi-azure-devops/
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
├── src/
│   ├── extension/
│   │   └── index.ts              # Extension entry: registers tools, commands, events
│   ├── auth/
│   │   ├── pat.ts                # PAT authentication handler
│   │   ├── azure-cli.ts          # Azure CLI authentication handler
│   │   └── index.ts              # Auth resolver (auto-detect, fallback)
│   ├── config/
│   │   └── index.ts              # Configuration resolver (env → settings → defaults)
│   ├── tools/
│   │   ├── doctor.ts               # Config/auth health check
│   │   ├── get-work-item.ts
│   │   ├── query-work-items.ts
│   │   ├── create-work-item.ts
│   │   ├── update-work-item.ts
│   │   ├── add-work-item-comment.ts
│   │   ├── get-work-item-comments.ts
│   │   ├── manage-work-item-links.ts
│   │   ├── get-work-item-revisions.ts
│   │   ├── list-work-item-types.ts
│   │   └── shared.ts             # Common schemas, response formatting, error handling
│   ├── safety/
│   │   └── index.ts              # Safety level resolver + tool_call interceptor
│   ├── autocomplete/
│   │   └── work-item-autocomplete.ts  # #1234 completion provider
│   └── utils/
│       ├── connection.ts         # WebApi connection factory
│       ├── formatting.ts         # Work item → readable text formatting
│       └── errors.ts             # ADO error → user-friendly message mapping
├── skills/
│   └── ado-workitems/
│       └── SKILL.md
├── prompts/
│   ├── ado-triage.md
│   ├── ado-status-report.md
│   ├── ado-create-batch.md
│   └── ado-review-history.md
│   ├── mocks/
│   │   ├── fixtures/
│   │   │   ├── work-items.json
│   │   │   ├── work-item-types.json
│   │   │   ├── comments.json
│   │   │   ├── revisions.json
│   │   │   └── query-results.json
│   │   └── mock-handler.ts        # Returns fixture data for mock mode
│   └── utils/
│       ├── connection.ts         # WebApi connection factory
│       ├── formatting.ts         # Work item → readable text formatting
│       └── errors.ts             # ADO error → user-friendly message mapping
├── skills/
│   └── ado-workitems/
│       └── SKILL.md
├── prompts/
│   ├── ado-triage.md
│   ├── ado-status-report.md
│   ├── ado-create-batch.md
│   └── ado-review-history.md
└── test/
    ├── tools/
    │   ├── doctor.test.ts
    │   ├── get-work-item.test.ts
    │   ├── query-work-items.test.ts
    │   ├── create-work-item.test.ts
    │   └── ...
    ├── auth/
    │   └── auth-resolver.test.ts
    ├── config/
    │   └── config-resolver.test.ts
    ├── safety/
    │   └── safety-interceptor.test.ts
    └── mocks/
        └── mock-handler.test.ts
```

---

## Dependencies

```jsonc
{
  "dependencies": {
    "azure-devops-node-api": "^15.1.0"   // ADO REST API client
  },
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*",  // Extension types
    "typebox": "*"                            // Schema definitions
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.0.0"                          // Test runner
  }
}
```

Note: `@earendil-works/pi-ai` for `StringEnum` is available through the pi runtime but listed in peer deps only if directly imported. `azure-devops-node-api` is the only runtime dependency.

---

## Implementation Order

1. **Scaffold** — project structure, package.json, tsconfig, build pipeline
2. **Config + Auth** — configuration resolver, PAT handler, Azure CLI handler, auto-detect
3. **Connection** — WebApi factory, error handling, connection validation tool (`ado_doctor`)
4. **Mock mode** — fixture data, mock handler, per-tool mock parameter
5. **Read tools** — `ado_get_work_item`, `ado_query_work_items`, `ado_list_work_item_types`, `ado_get_work_item_comments`, `ado_get_work_item_revisions`
6. **Safety** — safety level resolver, tool_call interceptor, confirmation dialogs
7. **Write tools** — `ado_create_work_item`, `ado_update_work_item`, `ado_add_work_item_comment`, `ado_manage_work_item_links`
8. **Skill** — `ado-workitems/SKILL.md`
9. **Prompt templates** — triage, status report, create batch, review history
10. **Autocomplete** — `#<id>` work item completion
11. **Tests** — unit tests for auth, config, safety, tool logic, mock mode
12. **README + docs** — installation, configuration, usage examples, contributing guide
13. **Publish** — npm publish as `@jwayong/pi-azure-devops`, tag `pi-package`, submit to pi.dev gallery

---

## Resolved Decisions

- [x] npm scope: `@jwayong/pi-azure-devops`
- [x] `ado_doctor` tool: included in Phase 1
- [x] Mock mode: included for offline development, testing, and CI
- [x] Minimum Node version: 20 (matches pi)
