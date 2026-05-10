/**
 * ado_set_board_columns — Reconfigure columns on a board.
 */

import { Type } from "typebox";
import { resolveConfig, type AdoConfig } from "../config/index.js";
import { getWorkApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { formatBoard } from "../utils/formatting.js";
import { isMock, TeamParam, resolveTeamContext, textResult, errorResult, type ToolResult } from "./shared.js";
import { mockSetBoardColumns } from "../mocks/mock-handler.js";

/** Schema for a single column definition */
const ColumnSchema = Type.Object({
	name: Type.String({ description: "Column name" }),
	itemLimit: Type.Optional(Type.Number({ description: "WIP limit for the column" })),
	stateMappings: Type.Optional(Type.Record(Type.String(), Type.String(), {
		description: "Map work item type → state for this column, e.g. { 'User Story': 'Active' }",
	})),
});

export const setBoardColumnsTool = {
	name: "ado_set_board_columns",
	description:
		"Reconfigure columns on an Azure DevOps board. Replaces all columns with the provided set. " +
		"Each column has a name, optional WIP limit, and state mappings per work item type.",
	parameters: Type.Object({
		boardId: Type.String({ description: "Board ID (e.g. 'Stories', 'Features')" }),
		columns: Type.Array(ColumnSchema, { description: "New column definitions (replaces existing)" }),
		team: TeamParam,
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Set columns on an ADO board",
	promptGuidelines: [
		"Use ado_set_board_columns to rename, reorder, or change WIP limits on board columns.",
		"This replaces ALL columns — use ado_get_board first to see current config.",
	],

	async execute(
		_toolCallId: string,
		params: {
			boardId: string;
			columns: Array<{ name: string; itemLimit?: number; stateMappings?: Record<string, string> }>;
			team?: string;
			mock?: boolean;
		},
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AdoConfig },
	): Promise<ToolResult> {
		const config = ctx.config ?? resolveConfig(ctx.cwd);

		const teamCtx = resolveTeamContext(config, params.team);
		if (!teamCtx) {
			return errorResult("No team specified. Set ADO_TEAM (env), ado.team (settings), or pass the team parameter.");
		}

		if (isMock(config, params.mock)) {
			return mockSetBoardColumns(teamCtx.team, params.boardId, params.columns);
		}

		try {
			const workApi = await getWorkApi(config, signal);

			// Build column objects for the API
			const boardColumns = params.columns.map((col, index) => ({
				name: col.name,
				itemLimit: col.itemLimit ?? null,
				stateMappings: col.stateMappings ?? {},
				columnType: index === 0 ? 0 : index === params.columns.length - 1 ? 2 : 1,
			}));

			const result = await workApi.updateBoardColumns(
				boardColumns as any,
				teamCtx,
				params.boardId,
			);

			const colNames = params.columns.map((c) => c.name).join(" → ");
			return textResult(
				[
					`✅ Updated columns on board "${params.boardId}" for ${teamCtx.team}`,
					"",
					`Columns: ${colNames}`,
					"",
					result ? formatBoard(result as any) : "",
				].join("\n"),
				{ team: teamCtx.team, boardId: params.boardId, columnCount: params.columns.length },
			);
		} catch (err) {
			return errorResult(`Failed to set board columns: ${formatAdoError(err)}`);
		}
	},
};
