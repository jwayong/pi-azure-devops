/**
 * Auth resolver — auto-detects and creates the appropriate auth handler.
 *
 * Priority:
 * 1. If authMethod is "pat" or ADO_PAT is explicitly set → PAT
 * 2. If authMethod is "azure-cli" → Azure CLI
 * 3. Auto mode: try PAT first (if token available), then Azure CLI
 */

import { createPatAuth } from "./pat.js";
import { createAzureCliAuth, clearTokenCache } from "./azure-cli.js";
import type { AdoConfig, AuthMethod } from "../config/index.js";
import type { getPersonalAccessTokenHandler } from "azure-devops-node-api";

type IRequestHandler = ReturnType<typeof getPersonalAccessTokenHandler>;

export interface AuthResult {
	/** The request handler for azure-devops-node-api */
	handler: IRequestHandler;
	/** Which auth method was actually used */
	method: "pat" | "azure-cli";
}

export interface AuthError {
	message: string;
	methods: string[];
}

/**
 * Resolve authentication based on config.
 *
 * @param config - Resolved ADO config
 * @param signal - Optional abort signal for Azure CLI token acquisition
 * @returns auth result, or throws if no auth method works
 */
export async function resolveAuth(
	config: AdoConfig,
	signal?: AbortSignal,
): Promise<AuthResult> {
	const errors: string[] = [];

	// Determine which methods to try
	const methods = getMethodsToTry(config.authMethod);

	for (const method of methods) {
		if (method === "pat") {
			const result = createPatAuth(process.env.ADO_PAT);
			if (result) return result;
			errors.push("PAT: ADO_PAT not set");
		}

		if (method === "azure-cli") {
			const result = await createAzureCliAuth(signal);
			if (result) return result;
			errors.push("Azure CLI: az not authenticated or not available");
		}
	}

	throw new AuthResolutionError(
		"No Azure DevOps authentication method available. " +
			"Set ADO_PAT or authenticate with `az login`.",
		errors,
	);
}

/**
 * Try to resolve auth, returning undefined instead of throwing.
 */
export async function tryResolveAuth(
	config: AdoConfig,
	signal?: AbortSignal,
): Promise<AuthResult | undefined> {
	try {
		return await resolveAuth(config, signal);
	} catch {
		return undefined;
	}
}

/**
 * Get the ordered list of auth methods to try based on config.
 */
function getMethodsToTry(authMethod: AuthMethod): ("pat" | "azure-cli")[] {
	switch (authMethod) {
		case "pat":
			return ["pat"];
		case "azure-cli":
			return ["azure-cli"];
		case "auto":
		default:
			// Auto mode: try PAT first if env var is set, then Azure CLI
			return process.env.ADO_PAT ? ["pat", "azure-cli"] : ["azure-cli", "pat"];
	}
}

/**
 * Error thrown when no auth method succeeds.
 */
export class AuthResolutionError extends Error {
	constructor(
		message: string,
		public readonly attemptedMethods: string[],
	) {
		super(message);
		this.name = "AuthResolutionError";
	}
}

// Re-export for convenience
export { clearTokenCache };
