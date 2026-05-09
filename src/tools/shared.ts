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
]);

export function isMutationTool(toolName: string): boolean {
	return MUTATION_TOOLS.has(toolName);
}
