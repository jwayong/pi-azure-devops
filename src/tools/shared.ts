/**
 * Shared tool utilities — common schemas, response helpers, and mock detection.
 */

import { Type } from "typebox";
import type { AdoConfig } from "../config/index.js";

// ---------------------------------------------------------------------------
// Common schemas
// ---------------------------------------------------------------------------

/** Mock parameter — supported by all tools */
export const MockParam = Type.Optional(
	Type.Boolean({ description: "Use mock/fixture data instead of live ADO API" }),
);

/** Team parameter — overrides config default team */
export const TeamParam = Type.Optional(
	Type.String({ description: "Team name (defaults to ado.team from config)" }),
);

/** Work item ID parameter */
export const WorkItemIdParam = Type.Object({
	workItemId: Type.Number({ description: "Work item ID" }),
	mock: MockParam,
});

/** Single work item ID */
export const SingleIdParam = Type.Object({
	id: Type.Number({ description: "Work item ID" }),
	mock: MockParam,
});

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

export interface ToolResult {
	content: Array<{ type: "text"; text: string }>;
	details: Record<string, unknown>;
}

export function textResult(text: string, details: Record<string, unknown> = {}): ToolResult {
	return {
		content: [{ type: "text", text }],
		details,
	};
}

export function errorResult(message: string): ToolResult {
	return {
		content: [{ type: "text", text: `❌ ${message}` }],
		details: { error: true },
	};
}

// ---------------------------------------------------------------------------
// Mock detection
// ---------------------------------------------------------------------------

/**
 * Check if mock mode is active for this tool invocation.
 * Checks both the tool parameter and the global config.
 */
export function isMock(config: AdoConfig, toolMock?: boolean): boolean {
	return config.mock || toolMock === true;
}

// ---------------------------------------------------------------------------
// Tool metadata
// ---------------------------------------------------------------------------

/** All mutation tool names — used by the safety interceptor */
export const MUTATION_TOOLS = new Set([
	"ado_create_work_item",
	"ado_update_work_item",
	"ado_add_work_item_comment",
	"ado_manage_work_item_links",
	// Phase 5: Boards & Backlogs
	"ado_set_board_columns",
	"ado_set_iteration",
	"ado_set_capacity",
	// Phase 3: Repos & Pull Requests
	"ado_create_pull_request",
	"ado_update_pull_request",
	"ado_add_pull_request_comment",
	"ado_set_pull_request_vote",
	// Phase 2: Pipelines
	"ado_run_pipeline",
	"ado_cancel_run",
	"ado_retry_run",
	// Phase 4: Test Plans
	"ado_create_test_run",
	"ado_update_test_results",
]);

export function isMutationTool(toolName: string): boolean {
	return MUTATION_TOOLS.has(toolName);
}

// ---------------------------------------------------------------------------
// Team context
// ---------------------------------------------------------------------------

/**
 * ADO TeamContext — { project, team }.
 * Used by all WorkApi (boards, backlogs, iterations, capacity) methods.
 */
export interface TeamContext {
	project: string;
	team: string;
}

/**
 * Resolve a TeamContext from config + optional param override.
 *
 * - If `teamParam` is provided, use it.
 * - Otherwise, fall back to `config.team`.
 * - Returns `undefined` if neither is set (caller should return an error).
 */
export function resolveTeamContext(
	config: AdoConfig,
	teamParam?: string,
): TeamContext | undefined {
	const team = teamParam?.trim() || config.team;
	if (!team) return undefined;
	return { project: config.project, team };
}
