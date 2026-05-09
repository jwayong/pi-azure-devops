/**
 * ado_list_work_item_types — List available work item types for the project.
 */

import { Type } from "typebox";
import { resolveConfig, type AdoConfig } from "../config/index.js";
import { getWorkItemTrackingApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatWorkItemTypeList } from "../utils/formatting.js";
import { isMock, textResult, errorResult, type ToolResult } from "./shared.js";
import { mockListWorkItemTypes } from "../mocks/mock-handler.js";

export const listWorkItemTypesTool = {
	name: "ado_list_work_item_types",
	description:
		"List all available work item types for the Azure DevOps project. " +
		"Use before creating work items to determine valid types.",
	parameters: Type.Object({
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "List ADO work item types",
	promptGuidelines: [
		"Use ado_list_work_item_types before ado_create_work_item to see valid types for the project.",
	],

	async execute(
		_toolCallId: string,
		params: { mock?: boolean },
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AdoConfig },
	): Promise<ToolResult> {
		const config = ctx.config ?? resolveConfig(ctx.cwd);

		if (isMock(config, params.mock)) {
			return mockListWorkItemTypes();
		}

		try {
			const witApi = await getWorkItemTrackingApi(config, signal);
			const types = await witApi.getWorkItemTypes(config.project);

			if (!types || types.length === 0) {
				return textResult("No work item types found for this project.");
			}

			return textResult(
				`Work item types for ${config.project}:\n\n${formatWorkItemTypeList(types as any)}`,
				{ count: types.length },
			);
		} catch (err) {
			return errorResult(`Failed to list work item types: ${formatAdoError(err)}`);
		}
	},
};
