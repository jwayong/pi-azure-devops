/**
 * Safety model — gates mutation operations based on user configuration.
 *
 * Three levels:
 * - open: no confirmation, mutations proceed freely
 * - confirm: user confirmation dialog before each mutation
 * - readonly: mutation tools blocked entirely
 */

import type { SafetyLevel } from "../config/index.js";
import { MUTATION_TOOLS } from "../tools/shared.js";

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

/**
 * Check if a tool is a mutation tool.
 */
export function isMutationTool(toolName: string): boolean {
	return MUTATION_TOOLS.has(toolName);
}

/**
 * Determine if a tool call should be blocked based on safety level.
 * Returns undefined if the call should proceed, or a block reason.
 */
export function shouldBlock(safetyLevel: SafetyLevel, toolName: string): string | undefined {
	if (!isMutationTool(toolName)) return undefined;

	switch (safetyLevel) {
		case "readonly":
			return `Tool "${toolName}" is blocked in readonly safety mode. Change ADO_SAFETY_LEVEL or ado.safetyLevel to "open" or "confirm".`;
		case "open":
			return undefined;
		case "confirm":
			// Handled by the interceptor — not blocked here
			return undefined;
		default:
			return undefined;
	}
}

// ---------------------------------------------------------------------------
// Confirmation summaries
// ---------------------------------------------------------------------------

interface MutationParams {
	[key: string]: unknown;
}

/**
 * Format a human-readable summary of a mutation operation for confirmation.
 */
export function formatMutationSummary(toolName: string, params: MutationParams): string {
	switch (toolName) {
		case "ado_create_work_item": {
			const type = String(params.type ?? "work item");
			const title = String(params.title ?? "(untitled)");
			return `Create ${type}: "${title}"`;
		}
		case "ado_update_work_item": {
			const id = params.id ?? params.workItemId ?? "?";
			const fields = params.fields as Record<string, string> | undefined;
			const fieldSummary = fields
				? Object.entries(fields)
						.map(([k, v]) => `${k} → ${v}`)
						.join(", ")
				: "(no fields)";
			return `Update #${id}: ${fieldSummary}`;
		}
		case "ado_add_work_item_comment": {
			const id = params.workItemId ?? "?";
			const text = String(params.text ?? "").slice(0, 80);
			const ellipsis = String(params.text ?? "").length > 80 ? "..." : "";
			return `Comment on #${id}: "${text}${ellipsis}"`;
		}
		case "ado_manage_work_item_links": {
			const operation = String(params.operation ?? "add");
			const sourceId = params.workItemId ?? "?";
			const targetId = params.targetId ?? "?";
			const relType = String(params.relationType ?? "link");
			return `${operation === "add" ? "Add" : "Remove"} ${relType} link: #${sourceId} ${operation === "add" ? "→" : "✕"} #${targetId}`;
		}
		case "ado_set_board_columns": {
			const boardId = String(params.boardId ?? "?");
			const team = String(params.team ?? "(default team)");
			const columns = params.columns as Array<{ name?: string }> | undefined;
			const colNames = columns?.map((c) => c.name ?? "?").join(" → ") ?? "(none)";
			return `Set board columns for "${boardId}" (${team}): ${colNames}`;
		}
		case "ado_set_iteration": {
			const op = String(params.operation ?? "add");
			const iterationId = String(params.iterationId ?? "?");
			const team = String(params.team ?? "(default team)");
			return `${op === "add" ? "Add" : "Remove"} iteration ${iterationId} ${op === "add" ? "to" : "from"} ${team}`;
		}
		case "ado_set_capacity": {
			const iterationId = String(params.iterationId ?? "?");
			const capacities = params.capacities as Array<unknown> | undefined;
			const count = capacities?.length ?? 0;
			return `Set capacity for ${count} team member(s) in iteration ${iterationId}`;
		}
		default:
			return `${toolName}: ${JSON.stringify(params).slice(0, 100)}`;
	}
}
