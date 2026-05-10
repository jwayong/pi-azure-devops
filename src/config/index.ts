import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Authentication method */
export type AuthMethod = "pat" | "azure-cli" | "auto";

/** Safety level for mutation operations */
export type SafetyLevel = "open" | "confirm" | "readonly";

/** Resolved ADO configuration */
export interface AdoConfig {
	/** Azure DevOps organization URL, e.g. https://dev.azure.com/myorg */
	orgUrl: string;
	/** Default project name */
	project: string;
	/** Default team name (optional — tools that need teams can require it as a param if unset) */
	team: string | undefined;
	/** Authentication method */
	authMethod: AuthMethod;
	/** Safety level for mutation tools */
	safetyLevel: SafetyLevel;
	/** Default work item type when creating */
	defaultWorkItemType: string;
	/** Maximum number of query results */
	maxQueryResults: number;
	/** Enable #id autocomplete */
	autocomplete: boolean;
	/** Mock mode — use fixture data without network calls */
	mock: boolean;
}

/** Shape of the `ado` key in pi settings.json */
export interface AdoSettings {
	orgUrl?: string;
	project?: string;
	team?: string;
	authMethod?: string;
	safetyLevel?: string;
	defaultWorkItemType?: string;
	maxQueryResults?: number;
	autocomplete?: boolean;
	mock?: boolean;
}

/** Error thrown when required config is missing */
export class ConfigError extends Error {
	constructor(
		public readonly missing: string[],
		message?: string,
	) {
		super(message ?? `Missing required ADO configuration: ${missing.join(", ")}`);
		this.name = "ConfigError";
	}
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS: Omit<AdoConfig, "orgUrl" | "project" | "team"> = {
	authMethod: "auto",
	safetyLevel: "confirm",
	defaultWorkItemType: "User Story",
	maxQueryResults: 100,
	autocomplete: true,
	mock: false,
};

const VALID_AUTH_METHODS = new Set<string>(["pat", "azure-cli", "auto"]);
const VALID_SAFETY_LEVELS = new Set<string>(["open", "confirm", "readonly"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAgentDir(): string {
	return process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");
}

function readSettingsFile(filePath: string): Record<string, unknown> {
	if (!existsSync(filePath)) return {};
	try {
		const content = readFileSync(filePath, "utf-8");
		return JSON.parse(content) as Record<string, unknown>;
	} catch {
		return {};
	}
}

function readAdoSettings(cwd: string): AdoSettings {
	// Global settings
	const globalSettings = readSettingsFile(join(getAgentDir(), "settings.json"));
	// Project settings
	const projectSettings = readSettingsFile(join(cwd, ".pi", "settings.json"));

	// Merge: project overrides global for the `ado` key
	const globalAdo = (globalSettings.ado ?? {}) as AdoSettings;
	const projectAdo = (projectSettings.ado ?? {}) as AdoSettings;

	return { ...globalAdo, ...projectAdo };
}

function validateAuthMethod(value: string | undefined): AuthMethod | undefined {
	if (!value) return undefined;
	const normalized = value.toLowerCase().trim();
	return VALID_AUTH_METHODS.has(normalized) ? (normalized as AuthMethod) : undefined;
}

function validateSafetyLevel(value: string | undefined): SafetyLevel | undefined {
	if (!value) return undefined;
	const normalized = value.toLowerCase().trim();
	return VALID_SAFETY_LEVELS.has(normalized) ? (normalized as SafetyLevel) : undefined;
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

/**
 * Resolve ADO configuration from environment variables, pi settings, and defaults.
 *
 * Precedence: env vars → settings.json → defaults
 *
 * @param cwd - Current working directory (for resolving project settings)
 * @throws {ConfigError} when required fields (orgUrl, project) are missing
 */
export function resolveConfig(cwd: string = process.cwd()): AdoConfig {
	const settings = readAdoSettings(cwd);

	// Required fields — env vars first, then settings
	const orgUrl = process.env.ADO_ORG_URL ?? settings.orgUrl;
	const project = process.env.ADO_PROJECT ?? settings.project;

	// Collect missing required fields
	const missing: string[] = [];
	if (!orgUrl) missing.push("ADO_ORG_URL (env) or ado.orgUrl (settings)");
	if (!project) missing.push("ADO_PROJECT (env) or ado.project (settings)");

	if (missing.length > 0) {
		throw new ConfigError(missing);
	}

	// After the throw above, orgUrl and project are guaranteed string
	const resolvedOrgUrl = orgUrl!.replace(/\/+$/, ""); // trim trailing slashes
	const resolvedProject = project!;

	// Team — optional, env var first then settings
	const team = process.env.ADO_TEAM?.trim() || settings.team?.trim() || undefined;

	// Optional fields — env vars first, then settings, then defaults
	const authMethod =
		validateAuthMethod(process.env.ADO_AUTH_METHOD) ??
		validateAuthMethod(settings.authMethod) ??
		DEFAULTS.authMethod;

	const safetyLevel =
		validateSafetyLevel(process.env.ADO_SAFETY_LEVEL) ??
		validateSafetyLevel(settings.safetyLevel) ??
		DEFAULTS.safetyLevel;

	const defaultWorkItemType =
		settings.defaultWorkItemType ?? DEFAULTS.defaultWorkItemType;

	const maxQueryResults =
		settings.maxQueryResults ?? DEFAULTS.maxQueryResults;

	const autocomplete =
		settings.autocomplete ?? DEFAULTS.autocomplete;

	// Mock mode: env var or settings
	const mock =
		process.env.ADO_MOCK === "1" || process.env.ADO_MOCK === "true"
			? true
			: (settings.mock ?? DEFAULTS.mock);

	return {
		orgUrl: resolvedOrgUrl,
		project: resolvedProject,
		team,
		authMethod,
		safetyLevel,
		defaultWorkItemType,
		maxQueryResults,
		autocomplete,
		mock,
	};
}

/**
 * Resolve config but return undefined instead of throwing on missing required fields.
 * Useful for optional/deferred initialization.
 */
export function tryResolveConfig(cwd?: string): AdoConfig | undefined {
	try {
		return resolveConfig(cwd);
	} catch {
		return undefined;
	}
}

/**
 * Resolve config and return a structured health report.
 * Used by the ado_doctor tool.
 */
export function resolveConfigForDoctor(cwd?: string): {
	config: AdoConfig | undefined;
	errors: string[];
	warnings: string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];

	try {
		const config = resolveConfig(cwd);

		// Validate auth method value
		if (!VALID_AUTH_METHODS.has(config.authMethod)) {
			warnings.push(`Invalid authMethod "${config.authMethod}", will fall back to auto-detect`);
		}

		// Validate safety level value
		if (!VALID_SAFETY_LEVELS.has(config.safetyLevel)) {
			warnings.push(`Invalid safetyLevel, using default "${DEFAULTS.safetyLevel}"`);
		}

		// Check if PAT is available when auth method implies it
		if ((config.authMethod === "pat" || config.authMethod === "auto") && !process.env.ADO_PAT) {
			warnings.push("ADO_PAT not set — PAT auth unavailable, will try Azure CLI");
		}

		return { config, errors, warnings };
	} catch (err) {
		if (err instanceof ConfigError) {
			errors.push(...err.missing);
		} else {
			errors.push(String(err));
		}
		return { config: undefined, errors, warnings };
	}
}
