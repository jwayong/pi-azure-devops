import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatMutationSummary } from "../../src/safety/index.js";

describe("formatMutationSummary Phase 5 tools", () => {
	it("formats ado_set_board_columns summary", () => {
		const summary = formatMutationSummary("ado_set_board_columns", {
			boardId: "Stories",
			team: "Engineering",
			columns: [{ name: "New" }, { name: "Active" }, { name: "Closed" }],
		});
		assert.ok(summary.includes("Stories"));
		assert.ok(summary.includes("Engineering"));
		assert.ok(summary.includes("New → Active → Closed"));
	});

	it("formats ado_set_board_columns with missing fields", () => {
		const summary = formatMutationSummary("ado_set_board_columns", {});
		assert.ok(summary.includes("?"));
	});

	it("formats ado_set_iteration add summary", () => {
		const summary = formatMutationSummary("ado_set_iteration", {
			iterationId: "sprint-3",
			operation: "add",
			team: "Engineering",
		});
		assert.ok(summary.includes("Add"));
		assert.ok(summary.includes("sprint-3"));
		assert.ok(summary.includes("Engineering"));
	});

	it("formats ado_set_iteration remove summary", () => {
		const summary = formatMutationSummary("ado_set_iteration", {
			iterationId: "sprint-1",
			operation: "remove",
			team: "Platform",
		});
		assert.ok(summary.includes("Remove"));
		assert.ok(summary.includes("sprint-1"));
		assert.ok(summary.includes("Platform"));
	});

	it("formats ado_set_capacity summary", () => {
		const summary = formatMutationSummary("ado_set_capacity", {
			iterationId: "sprint-2",
			capacities: [{ teamMemberId: "user1" }, { teamMemberId: "user2" }, { teamMemberId: "user3" }],
		});
		assert.ok(summary.includes("3"));
		assert.ok(summary.includes("sprint-2"));
	});

	it("formats ado_set_capacity with empty capacities", () => {
		const summary = formatMutationSummary("ado_set_capacity", {
			iterationId: "sprint-2",
		});
		assert.ok(summary.includes("0"));
	});
});
