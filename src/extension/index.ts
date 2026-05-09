import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { resolveConfig, type AdoConfig } from "../config/index.js";
import { runDoctor } from "../tools/doctor.js";

export default function (pi: ExtensionAPI) {
	// Resolve config once per session
	let config: AdoConfig | undefined;

	pi.on("session_start", async (_event, ctx) => {
		config = resolveConfig(ctx.cwd);
		ctx.ui.notify(`@jwayong/pi-azure-devops loaded (project: ${config.project})`, "info");
	});

	// ado_doctor
	pi.registerTool({
		name: "ado_doctor",
		label: "ADO Doctor",
		description:
			"Check Azure DevOps configuration, authentication readiness, and connection health. " +
			"Run this first to verify your setup before using other ADO tools.",
		parameters: Type.Object({
			mock: Type.Optional(
				Type.Boolean({
					description: "Use mock mode (report healthy without network)",
				}),
			),
		}),
		promptSnippet: "Check Azure DevOps configuration and connectivity",
		promptGuidelines: [
			"Use ado_doctor before other ADO tools to verify the user's setup is working.",
		],
		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			return runDoctor(ctx.cwd, config, params.mock, signal);
		},
	});
}
