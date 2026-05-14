import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { type AdoConfig } from "../../src/config/index.js";

function makeConfig(overrides: Partial<AdoConfig> = {}): AdoConfig {
	return {
		orgUrl: "https://dev.azure.com/testorg",
		project: "TestProject",
		authMethod: "pat",
		safetyLevel: "confirm",
		defaultWorkItemType: "User Story",
		maxQueryResults: 100,
		autocomplete: true,
		mock: false,
		...overrides,
	};
}

const mockCtx = { cwd: "/test", config: makeConfig({ mock: true }) };
const noop = undefined as any;

// ---------------------------------------------------------------------------
// ado_run_pipeline
// ---------------------------------------------------------------------------

describe("ado_run_pipeline (mock)", () => {
	it("queues a pipeline run", async () => {
		const { runPipelineTool } = await import("../../src/tools/run-pipeline.js");
		const result = await runPipelineTool.execute(
			"",
			{ pipelineId: 1, mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("Queued"));
		assert.ok(result.content[0].text.includes("CI Pipeline"));
		assert.equal(result.details.pipelineId, 1);
	});

	it("queues with branch", async () => {
		const { runPipelineTool } = await import("../../src/tools/run-pipeline.js");
		const result = await runPipelineTool.execute(
			"",
			{ pipelineId: 1, branch: "develop", mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("develop"));
	});

	it("queues with template parameters", async () => {
		const { runPipelineTool } = await import("../../src/tools/run-pipeline.js");
		const result = await runPipelineTool.execute(
			"",
			{
				pipelineId: 2,
				templateParameters: { environment: "staging" },
				mock: true,
			},
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("environment=staging"));
	});

	it("returns error for unknown pipeline", async () => {
		const { runPipelineTool } = await import("../../src/tools/run-pipeline.js");
		const result = await runPipelineTool.execute(
			"",
			{ pipelineId: 999, mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("not found"));
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// ado_cancel_run
// ---------------------------------------------------------------------------

describe("ado_cancel_run (mock)", () => {
	it("cancels an in-progress run", async () => {
		const { cancelRunTool } = await import("../../src/tools/cancel-run.js");
		const result = await cancelRunTool.execute(
			"",
			{ pipelineId: 1, runId: 44, mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("Cancelled"));
		assert.ok(result.content[0].text.includes("cancelling"));
	});

	it("returns error for non-in-progress run", async () => {
		const { cancelRunTool } = await import("../../src/tools/cancel-run.js");
		const result = await cancelRunTool.execute(
			"",
			{ pipelineId: 1, runId: 42, mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("not in progress"));
		assert.equal(result.details.error, true);
	});

	it("returns error for unknown run", async () => {
		const { cancelRunTool } = await import("../../src/tools/cancel-run.js");
		const result = await cancelRunTool.execute(
			"",
			{ pipelineId: 1, runId: 9999, mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("not found"));
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// ado_retry_run
// ---------------------------------------------------------------------------

describe("ado_retry_run (mock)", () => {
	it("retries a run", async () => {
		const { retryRunTool } = await import("../../src/tools/retry-run.js");
		const result = await retryRunTool.execute(
			"",
			{ pipelineId: 1, runId: 43, mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("Retried"));
		assert.ok(result.content[0].text.includes("1043"));
		assert.equal(result.details.originalRunId, 43);
	});

	it("returns error for unknown run", async () => {
		const { retryRunTool } = await import("../../src/tools/retry-run.js");
		const result = await retryRunTool.execute(
			"",
			{ pipelineId: 1, runId: 9999, mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("not found"));
		assert.equal(result.details.error, true);
	});
});
