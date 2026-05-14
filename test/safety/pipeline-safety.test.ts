import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	isMutationTool,
	shouldBlock,
	formatMutationSummary,
} from "../../src/safety/index.js";

// ---------------------------------------------------------------------------
// isMutationTool — Pipeline tools
// ---------------------------------------------------------------------------

describe("isMutationTool — Pipeline tools", () => {
	const pipelineMutations = [
		"ado_run_pipeline",
		"ado_cancel_run",
		"ado_retry_run",
	];

	for (const tool of pipelineMutations) {
		it(`identifies ${tool} as mutation`, () => {
			assert.equal(isMutationTool(tool), true);
		});
	}

	const pipelineReads = [
		"ado_list_pipelines",
		"ado_get_pipeline",
		"ado_list_runs",
		"ado_get_run",
		"ado_get_run_artifacts",
		"ado_get_run_logs",
		"ado_get_run_timeline",
	];

	for (const tool of pipelineReads) {
		it(`does not flag ${tool} as mutation`, () => {
			assert.equal(isMutationTool(tool), false);
		});
	}
});

// ---------------------------------------------------------------------------
// shouldBlock — Pipeline tools
// ---------------------------------------------------------------------------

describe("shouldBlock — Pipeline tools", () => {
	const pipelineMutations = [
		"ado_run_pipeline",
		"ado_cancel_run",
		"ado_retry_run",
	];

	for (const tool of pipelineMutations) {
		it(`blocks ${tool} in readonly mode`, () => {
			const result = shouldBlock("readonly", tool);
			assert.ok(result);
			assert.ok(result!.includes("blocked in readonly"));
		});

		it(`allows ${tool} in open mode`, () => {
			assert.equal(shouldBlock("open", tool), undefined);
		});

		it(`does not block ${tool} in confirm mode (interceptor handles)`, () => {
			assert.equal(shouldBlock("confirm", tool), undefined);
		});
	}

	const pipelineReads = [
		"ado_list_pipelines",
		"ado_get_pipeline",
		"ado_list_runs",
	];

	for (const tool of pipelineReads) {
		it(`does not block read tool ${tool} in any mode`, () => {
			assert.equal(shouldBlock("readonly", tool), undefined);
			assert.equal(shouldBlock("confirm", tool), undefined);
			assert.equal(shouldBlock("open", tool), undefined);
		});
	}
});

// ---------------------------------------------------------------------------
// formatMutationSummary — Pipeline tools
// ---------------------------------------------------------------------------

describe("formatMutationSummary — Pipeline tools", () => {
	it("formats ado_run_pipeline with branch", () => {
		const summary = formatMutationSummary("ado_run_pipeline", {
			pipelineId: 1,
			branch: "main",
		});
		assert.ok(summary.includes("Run pipeline #1"));
		assert.ok(summary.includes("main"));
	});

	it("formats ado_run_pipeline with template parameters", () => {
		const summary = formatMutationSummary("ado_run_pipeline", {
			pipelineId: 2,
			branch: "release/v2",
			templateParameters: { environment: "production", region: "us-east" },
		});
		assert.ok(summary.includes("pipeline #2"));
		assert.ok(summary.includes("release/v2"));
		assert.ok(summary.includes("environment=production"));
		assert.ok(summary.includes("region=us-east"));
	});

	it("formats ado_run_pipeline with no branch", () => {
		const summary = formatMutationSummary("ado_run_pipeline", {
			pipelineId: 1,
		});
		assert.ok(summary.includes("(default)"));
	});

	it("formats ado_cancel_run", () => {
		const summary = formatMutationSummary("ado_cancel_run", {
			pipelineId: 1,
			runId: 44,
		});
		assert.ok(summary.includes("Cancel run #44"));
		assert.ok(summary.includes("pipeline #1"));
	});

	it("formats ado_retry_run", () => {
		const summary = formatMutationSummary("ado_retry_run", {
			pipelineId: 1,
			runId: 43,
		});
		assert.ok(summary.includes("Retry run #43"));
		assert.ok(summary.includes("pipeline #1"));
	});
});
