# PLAN: `pi-azure-devops` — Full Azure DevOps Integration for Pi

> A Pi package providing rich Azure DevOps integration, starting with work items and designed to grow into a comprehensive ADO integration (pipelines, repos, PRs, test plans, etc.).

## Status: Phase 2 Complete (v0.4.0). Phase 4 planned — #72–#80

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

### Phase 2: Pipelines (Builds & Runs)

#### Goal

Add tools for Azure DevOps YAML pipelines. Users can browse pipelines, view runs (builds), inspect artifacts/logs/timelines, trigger runs, cancel, and retry. Uses both the modern `PipelinesApi` (run-centric) and the classic `BuildApi` (build-centric for timeline/logs).

#### API Clients

- **PipelinesApi** from `azure-devops-node-api/PipelinesApi.js` — modern YAML pipeline operations: list/get pipelines, list/get/run pipelines, artifacts, logs
- **BuildApi** from `azure-devops-node-api/BuildApi.js` — classic build operations: timeline, update build (cancel/retry)

No new config fields needed — pipelines use the existing `ADO_ORG_URL` and `ADO_PROJECT`.

#### Tools

| # | Tool | Description | Mutation | API Method |
|---|------|-------------|----------|------------|
| 1 | `ado_list_pipelines` | List YAML pipelines in the project | No | `PipelinesApi.listPipelines(project)` |
| 2 | `ado_get_pipeline` | Get pipeline detail by ID | No | `PipelinesApi.getPipeline(project, pipelineId)` |
| 3 | `ado_list_runs` | List runs (optionally filtered by pipeline, status, result, branch) | No | `PipelinesApi.listRuns(project, pipelineId)` + `BuildApi.getBuilds(...)` |
| 4 | `ado_get_run` | Get single run detail | No | `PipelinesApi.getRun(project, pipelineId, runId)` |
| 5 | `ado_get_run_artifacts` | Get artifacts from a run | No | `BuildApi.getArtifacts(project, buildId)` |
| 6 | `ado_get_run_logs` | Get log entries for a run | No | `BuildApi.getBuildLogs(project, buildId)` |
| 7 | `ado_get_run_timeline` | Get stages/jobs/tasks timeline | No | `BuildApi.getBuildTimeline(project, buildId)` |
| 8 | `ado_run_pipeline` | Queue a new pipeline run | Yes | `PipelinesApi.runPipeline(params, project, pipelineId)` |
| 9 | `ado_cancel_run` | Cancel an in-progress run | Yes | `BuildApi.updateBuild({status: cancelling}, project, buildId)` |
| 10 | `ado_retry_run` | Retry a failed run | Yes | `BuildApi.updateBuild({}, project, buildId, retry=true)` |

#### Issues

| # | Issue | Depends On |
|----|-------|------------|
| #62 | Connection helpers (BuildApi + PipelinesApi) | — |
| #63 | Mock fixtures + handlers + formatting | #62 |
| #64 | Read tools (7 pipeline tools) | #62, #63 |
| #65 | Write tools (3 mutation tools) | #62, #63 |
| #66 | Safety model extensions | #65 |
| #67 | SKILL.md updates | #64, #65 |
| #68 | Prompt templates (pipeline-status, deploy) | #64 |
| #69 | Comprehensive test suite | #62–#66 |
| #70 | README/docs + publish v0.4.0 | #67–#69 |

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

### Phase 4: Test Plans & Test Runs

#### Goal

Add tools for Azure DevOps Test Plans. Users can browse test plans, suites, and cases; create and manage test runs; update test results; and view test point outcomes. Uses `ITestPlanApi` for plan/suite/case/point operations and `ITestResultsApi` for test run and result operations.

#### API Clients

- **TestPlanApi** from `azure-devops-node-api/TestPlanApi.js` — plan/suite/case/point CRUD: `getTestPlans`, `getTestSuitesForPlan`, `getTestCaseList`, `getPointsList`, `updateTestPoints`
- **TestResultsApi** from `azure-devops-node-api/TestResultsApi.js` — test runs and results: `createTestRun`, `getTestRunById`, `getTestRuns`, `updateTestRun`, `addTestResultsToTestRun`, `updateTestResults`, `getTestResults`

No new config fields needed — test plans use the existing `ADO_ORG_URL` and `ADO_PROJECT`.

#### Tools

| # | Tool | Description | Mutation | API Method |
|---|------|-------------|----------|------------|
| 1 | `ado_list_test_plans` | List test plans in the project, optionally filter by active | No | `TestPlanApi.getTestPlans(project, owner?, undefined, includePlanDetails?, filterActivePlans?)` |
| 2 | `ado_get_test_plan` | Get a single test plan by ID | No | `TestPlanApi.getTestPlanById(project, planId)` |
| 3 | `ado_list_test_suites` | List test suites for a plan | No | `TestPlanApi.getTestSuitesForPlan(project, planId, expand?)` |
| 4 | `ado_get_test_suite` | Get a single test suite by plan and suite ID | No | `TestPlanApi.getTestSuiteById(project, planId, suiteId, expand?)` |
| 5 | `ado_list_test_cases` | List test cases in a suite | No | `TestPlanApi.getTestCaseList(project, planId, suiteId, ...)` |
| 6 | `ado_list_test_points` | List test points in a suite (shows outcome, tester, configuration) | No | `TestPlanApi.getPointsList(project, planId, suiteId, ...)` |
| 7 | `ado_create_test_run` | Create a new test run from a test plan/suite | Yes | `TestResultsApi.createTestRun(runCreateModel, project)` |
| 8 | `ado_update_test_results` | Update test case results in a run (pass, fail, etc.) | Yes | `TestResultsApi.updateTestResults(results, project, runId)` |
| 9 | `ado_get_test_run` | Get a test run by ID with statistics | No | `TestResultsApi.getTestRunById(project, runId, includeDetails?)` |
| 10 | `ado_list_test_runs` | List test runs, optionally filter by plan or build | No | `TestResultsApi.getTestRuns(project, buildUri?, owner?, tmiRunId?, planId?, includeRunDetails?)` |

#### Design Decisions

- **TestPlanApi for structure, TestResultsApi for execution.** Plans, suites, cases, and points come from `TestPlanApi`. Runs and results come from `TestResultsApi`. This matches ADO's own API design.
- **`planId` is always a parameter.** Users may work across multiple test plans. Not configured globally.
- **`suiteId` required for case/point listing.** Test cases and points always belong to a specific suite within a plan.
- **Test outcomes mapped as strings.** ADO uses both numeric enums and strings for outcomes. Tools expose human-friendly strings: `"passed"`, `"failed"`, `"blocked"`, `"notExecuted"`, `"inconclusive"`, `"timeout"`, `"aborted"`, `"notApplicable"`, `"warning"`, `"error"`. Mapped to `TestOutcome` numeric enum for the API.
- **Test run states:** `"notStarted"`, `"inProgress"`, `"completed"`, `"aborted"`, `"waiting"`. Mapped to `TestRunState` numeric enum.
- **`ado_create_test_run` requires `planId` and `suiteIds`.** Creates a run scoped to a plan, selecting test points from specified suites.
- **`ado_update_test_results` takes `runId` + array of results.** Each result has `testCaseResultId`, `outcome`, and optional `comment`.
- **Test points show execution status.** `ado_list_test_points` returns the current outcome, assigned tester, and configuration for each point — useful for "who's testing what" queries.
- **No delete tools.** Deleting plans/suites/cases is destructive and rarely needed. Users can do this in the ADO UI.

#### Mock Fixtures

| File | Contents |
|------|----------|
| `test-plans.json` | 3 test plans (Sprint 42, Regression, Smoke) with states, dates, root suite refs |
| `test-suites.json` | 4 suites per plan (root, feature group, requirement-based, static) with children |
| `test-cases.json` | 6 test cases across suites with work item details (title, state, assigned to) |
| `test-points.json` | 8 test points with outcomes, configurations, testers |
| `test-runs.json` | 3 test runs (active, completed, completed) with statistics |
| `test-results.json` | 6 test case results with outcomes, durations, error messages |

#### Mock Handlers

| Handler | Returns |
|---------|----------|
| `mockListTestPlans(filters?)` | Filtered test plans |
| `mockGetTestPlan(planId)` | Single test plan or error |
| `mockListTestSuites(planId)` | Suites for a plan |
| `mockGetTestSuite(planId, suiteId)` | Single suite or error |
| `mockListTestCases(planId, suiteId)` | Test cases in a suite |
| `mockListTestPoints(planId, suiteId)` | Test points in a suite |
| `mockCreateTestRun(planId, suiteIds, name?)` | New test run |
| `mockUpdateTestResults(runId, results)` | Updated results |
| `mockGetTestRun(runId)` | Test run with statistics |
| `mockListTestRuns(planId?)` | Test runs, optionally filtered by plan |

#### Formatting Functions

| Function | Output |
|----------|--------|
| `formatTestPlan(plan)` | Plan ID, name, state, dates, iteration, root suite, owner |
| `formatTestPlanList(plans)` | Table: ID, name, state, dates, root suite |
| `formatTestSuite(suite)` | Suite ID, name, type, parent, children count |
| `formatTestSuiteList(suites)` | Compact list with hierarchy |
| `formatTestCase(tc)` | Case ID, title, state, assigned to, configuration, order |
| `formatTestCaseList(cases)` | Table: ID, title, state, assigned to |
| `formatTestPoint(point)` | Point ID, case, configuration, outcome, tester |
| `formatTestPointList(points)` | Table: point, case, config, outcome, tester |
| `formatTestRun(run)` | Run ID, name, state, pass/fail/total counts, dates |
| `formatTestRunList(runs)` | Table: ID, name, state, pass/total, date |
| `formatTestResult(result)` | Result ID, case, outcome, duration, comment |
| `formatTestResultList(results)` | Table: ID, case, outcome, duration |

#### Safety Model Additions

New mutation tools registered in `MUTATION_TOOLS`:
- `ado_create_test_run`
- `ado_update_test_results`

New `formatMutationSummary` cases:
- `ado_create_test_run`: `"Create test run: '{name}' (plan #{planId})"`
- `ado_update_test_results`: `"Update {n} test result(s) in run #{runId}"`

#### Connection Extensions

Add `getTestPlanApi()` and `getTestResultsApi()` to `src/utils/connection.ts`:

```typescript
export async function getTestPlanApi(config: AdoConfig, signal?: AbortSignal) {
  const connection = await getConnection(config, signal);
  return connection.getTestPlanApi();
}

export async function getTestResultsApi(config: AdoConfig, signal?: AbortSignal) {
  const connection = await getConnection(config, signal);
  return connection.getTestResultsApi();
}
```

#### Type Inference Pattern

```typescript
type TestPlan = Awaited<ReturnType<ITestPlanApi["getTestPlanById"]>>;
type TestSuite = Awaited<ReturnType<ITestPlanApi["getTestSuiteById"]>>;
type TestCase = Awaited<ReturnType<ITestPlanApi["getTestCaseList"]>>[number];
type TestPoint = Awaited<ReturnType<ITestPlanApi["getPointsList"]>>[number];
type TestRun = Awaited<ReturnType<ITestResultsApi["getTestRunById"]>>;
type TestCaseResult = Awaited<ReturnType<ITestResultsApi["getTestResults"]>>[number];
```

#### SKILL.md Updates

Add to `skills/ado-workitems/SKILL.md`:
- Test Plan reference (structure: plan → suite → case → point)
- Test outcome reference table
- Test run state reference table
- Test workflow guidance (browse plans → list cases → create run → update results)
- Suite type reference (static, dynamic/query-based, requirement-based)
- Best practices for test management

#### New Prompt Templates

| Template | Description |
|----------|-------------|
| `ado-test-status` | Test run status — summarize pass/fail rates, identify failures, suggest actions |
| `ado-test-runner` | Create and manage a test run — select plan/suite, create run, record results |

#### Issues

| # | Issue | Depends On |
|---|-------|------------|
| #72 | Connection helpers (TestPlanApi + TestResultsApi) | — |
| #73 | Mock fixtures + handlers + formatting | #72 |
| #74 | Read tools (8 test plan tools) | #72, #73 |
| #75 | Write tools (2 mutation tools) | #72, #73 |
| #76 | Safety model extensions | #75 |
| #77 | SKILL.md updates | #74, #75 |
| #78 | Prompt templates (test-status, test-runner) | #74 |
| #79 | Comprehensive test suite | #72–#76 |
| #80 | README/docs + publish v0.5.0 | #77–#79 |

**Total estimated tests: ~100 new (752 → ~852)**

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
