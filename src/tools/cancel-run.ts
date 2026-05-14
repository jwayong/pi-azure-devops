/**
 * ado_cancel_run — Cancel an in-progress pipeline run.
 */

import { Type } from "typebox";
import { resolveConfig, type AdoConfig } from "../config/index.js";
import { getBuildApi } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { isMock, textResult, errorResult, type ToolResult } from "./shared.js";
import { mockCancelRun } from "../mocks/mock-handler.js";

export const cancelRunTool = {
	name: "ado_cancel_run",
	description:
		"Cancel an in-progress pipeline run (build). Sets the build status to cancelling.",
	parameters: Type.Object({
		pipelineId: Type.Number({ description: "Pipeline ID" }),
		runId: Type.Number({ description: "Run (build) ID to cancel" }),
		mock: Type.Optional(Type.Boolean({ description: "Use mock/fixture data" })),
	}),
	promptSnippet: "Cancel a running pipeline",

	async execute(
		_toolCallId: string,
		params: { pipelineId: number; runId: number; mock?: boolean },
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AdoConfig },
	): Promise<ToolResult> {
		const config = ctx.config ?? resolveConfig(ctx.cwd);

		if (isMock(config, params.mock)) {
			return mockCancelRun(params.pipelineId, params.runId);
		}

		try {
			const buildApi = await getBuildApi(config, signal);

			// BuildStatus.Cancelling = 4
			const updated = await buildApi.updateBuild(
				{ status: 4 } as any,
				config.project,
				params.runId,
			);

			return textResult(
				[
					`✅ Cancelled run #${params.runId}`,
					"",
					`- **Pipeline:** #${params.pipelineId}`,
					`- **Status:** cancelling`,
				].join("\n"),
				{ pipelineId: params.pipelineId, runId: params.runId },
			);
		} catch (err) {
			return errorResult(`Failed to cancel run #${params.runId}: ${formatAdoError(err)}`);
		}
	},
};
