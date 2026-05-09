import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { resolveConfig, type AdoConfig } from "../config/index.js";
import { doctorTool } from "../tools/doctor.js";
import { getWorkItemTool } from "../tools/get-work-item.js";
import { queryWorkItemsTool } from "../tools/query-work-items.js";
import { listWorkItemTypesTool } from "../tools/list-work-item-types.js";
import { getWorkItemCommentsTool } from "../tools/get-work-item-comments.js";
import { getWorkItemRevisionsTool } from "../tools/get-work-item-revisions.js";

/** All tools to register */
const tools = [
	doctorTool,
	getWorkItemTool,
	queryWorkItemsTool,
	listWorkItemTypesTool,
	getWorkItemCommentsTool,
	getWorkItemRevisionsTool,
];

// Type alias for tool execute signature parameters
type ToolExecuteParams = [
	toolCallId: string,
	params: any,
	signal: AbortSignal | undefined,
	onUpdate: any,
	ctx: { cwd: string; config?: AdoConfig },
];

export default function (pi: ExtensionAPI) {
	// Resolve config once per session
	let config: AdoConfig | undefined;

	pi.on("session_start", async (_event, ctx) => {
		config = resolveConfig(ctx.cwd);
		ctx.ui.notify(`@jwayong/pi-azure-devops loaded (project: ${config.project})`, "info");
	});

	// Register all tools
	for (const tool of tools) {
		pi.registerTool({
			name: tool.name,
			label: tool.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
			description: tool.description,
			parameters: tool.parameters,
			promptSnippet: ("promptSnippet" in tool) ? (tool as any).promptSnippet : undefined,
			promptGuidelines: ("promptGuidelines" in tool) ? (tool as any).promptGuidelines : undefined,
			async execute(toolCallId: string, params: any, signal: AbortSignal | undefined, onUpdate: any, ctx: any) {
				return tool.execute(toolCallId, params, signal, onUpdate, {
					cwd: ctx.cwd,
					config,
				});
			},
		});
	}
}
