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
// ado_run_pipeline — edge cases
// ---------------------------------------------------------------------------

describe("ado_run_pipeline edge cases (mock)", () => {
	it("queues pipeline 3 (Test Pipeline)", async () => {
		const { runPipelineTool } = await import("../../src/tools/run-pipeline.js");
		const result = await runPipelineTool.execute(
			"",
			{ pipelineId: 3, mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("Test Pipeline"));
		assert.equal(result.details.pipelineId, 3);
	});

	it("includes branch in result", async () => {
		const { runPipelineTool } = await import("../../src/tools/run-pipeline.js");
		const result = await runPipelineTool.execute(
			"",
			{ pipelineId: 1, branch: "release/v2", mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("release/v2"));
	});
});

// ---------------------------------------------------------------------------
// ado_cancel_run — edge cases
// ---------------------------------------------------------------------------

describe("ado_cancel_run edge cases (mock)", () => {
	it("cannot cancel completed run", async () => {
		const { cancelRunTool } = await import("../../src/tools/cancel-run.js");
		const result = await cancelRunTool.execute(
			"",
			{ pipelineId: 2, runId: 15, mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("not in progress"));
	});

	it("cannot cancel run from wrong pipeline", async () => {
		const { cancelRunTool } = await import("../../src/tools/cancel-run.js");
		const result = await cancelRunTool.execute(
			"",
			{ pipelineId: 2, runId: 44, mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("not found"));
	});
});

// ---------------------------------------------------------------------------
// ado_retry_run — edge cases
// ---------------------------------------------------------------------------

describe("ado_retry_run edge cases (mock)", () => {
	it("retry returns incremented run ID", async () => {
		const { retryRunTool } = await import("../../src/tools/retry-run.js");
		const result = await retryRunTool.execute(
			"",
			{ pipelineId: 1, runId: 42, mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.equal(result.details.newRunId, 1042);
	});
});
