/**
 * ado_doctor — Check config, auth readiness, and connection health.
 */

import { Type } from "typebox";
import { resolveConfigForDoctor, type AdoConfig } from "../config/index.js";
import { tryResolveAuth } from "../auth/index.js";
import { getConnection } from "../utils/connection.js";
import { formatAdoError } from "../utils/errors.js";
import { isMock, textResult, errorResult, type ToolResult } from "./shared.js";

/**
 * Run the doctor check. Exported for testability.
 */
export async function runDoctor(
	cwd: string,
	config: AdoConfig | undefined,
	mock: boolean | undefined,
	signal?: AbortSignal,
): Promise<ToolResult> {
	// Resolve config if not provided
	if (!config) {
		const report = resolveConfigForDoctor(cwd);
		if (!report.config) {
			return errorResult(
				`ADO configuration issues:\n${report.errors.map((e) => `  ❌ ${e}`).join("\n")}\n\n` +
					"Set ADO_ORG_URL and ADO_PROJECT (env vars or settings.json).",
			);
		}
		config = report.config;
	}

	// Mock mode
	if (isMock(config, mock)) {
		return textResult(formatMockReport(config));
	}

	const lines: string[] = [];
	lines.push("## ADO Configuration");
	lines.push(`- **Org:** ${config.orgUrl}`);
	lines.push(`- **Project:** ${config.project}`);
	lines.push(`- **Auth Method:** ${config.authMethod}`);
	lines.push(`- **Safety Level:** ${config.safetyLevel}`);
	lines.push(`- **Mock Mode:** off`);

	// Auth check
	lines.push("");
	lines.push("## Authentication");
	const auth = await tryResolveAuth(config, signal);
	if (auth) {
		lines.push(`✅ Authenticated via **${auth.method}**`);
	} else {
		lines.push("❌ No authentication available");
		return errorResult(lines.join("\n"));
	}

	// Connection check
	lines.push("");
	lines.push("## Connection");
	try {
		const connection = await getConnection(config, signal);
		const witApi = await connection.getWorkItemTrackingApi();
		const types = await witApi.getWorkItemTypes(config.project);
		lines.push(`✅ Connected — ${types?.length ?? 0} work item types available`);
	} catch (err) {
		lines.push(`❌ Connection failed: ${formatAdoError(err)}`);
		return errorResult(lines.join("\n"));
	}

	return textResult(lines.join("\n"));
}

// ---------------------------------------------------------------------------
// Mock report
// ---------------------------------------------------------------------------

function formatMockReport(config: AdoConfig): string {
	return [
		"## ADO Configuration (Mock Mode)",
		`- **Org:** ${config.orgUrl}`,
		`- **Project:** ${config.project}`,
		`- **Auth Method:** ${config.authMethod}`,
		`- **Safety Level:** ${config.safetyLevel}`,
		`- **Mock Mode:** on`,
		"",
		"## Authentication",
		"✅ Mock — simulated as authenticated",
		"",
		"## Connection",
		"✅ Mock — simulated as connected (6 work item types)",
		"",
		"⚠️ Running in mock mode. No network calls were made.",
	].join("\n");
}

// ---------------------------------------------------------------------------
// Tool definition (matches the pattern used by other tools)
// ---------------------------------------------------------------------------

export const doctorTool = {
	name: "ado_doctor",
	description:
		"Check Azure DevOps configuration, authentication readiness, and connection health. " +
		"Run this first to verify your setup before using other ADO tools.",
	parameters: Type.Object({
		mock: Type.Optional(Type.Boolean({ description: "Use mock mode (report healthy without network)" })),
	}),
	promptSnippet: "Check Azure DevOps configuration and connectivity",
	promptGuidelines: [
		"Use ado_doctor before other ADO tools to verify the user's setup is working.",
	],

	async execute(
		_toolCallId: string,
		params: { mock?: boolean },
		signal: AbortSignal | undefined,
		_onUpdate: undefined,
		ctx: { cwd: string; config?: AdoConfig },
	): Promise<ToolResult> {
		return runDoctor(ctx.cwd, ctx.config, params.mock, signal);
	},
};
