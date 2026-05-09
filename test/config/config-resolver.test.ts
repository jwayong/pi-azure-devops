import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveConfig, tryResolveConfig, resolveConfigForDoctor, ConfigError } from "../../src/config/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Temporarily set env vars and restore them after the callback */
function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
	const originals = new Map<string, string | undefined>();
	for (const [key, value] of Object.entries(vars)) {
		originals.set(key, process.env[key]);
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
	try {
		fn();
	} finally {
		for (const [key, value] of originals) {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("resolveConfig", () => {
	it("throws ConfigError when orgUrl is missing", () => {
		withEnv({ ADO_ORG_URL: undefined, ADO_PROJECT: undefined }, () => {
			assert.throws(() => resolveConfig(), ConfigError);
		});
	});

	it("throws ConfigError when project is missing", () => {
		withEnv({ ADO_ORG_URL: "https://dev.azure.com/test", ADO_PROJECT: undefined }, () => {
			assert.throws(() => resolveConfig(), (err: unknown) => {
				assert(err instanceof ConfigError);
				assert.equal(err.missing.length, 1);
				assert(err.missing[0].includes("project"));
				return true;
			});
		});
	});

	it("throws ConfigError when both required fields are missing", () => {
		withEnv({ ADO_ORG_URL: undefined, ADO_PROJECT: undefined }, () => {
			assert.throws(() => resolveConfig(), (err: unknown) => {
				assert(err instanceof ConfigError);
				assert.equal(err.missing.length, 2);
				return true;
			});
		});
	});

	it("resolves config from env vars", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
				ADO_AUTH_METHOD: "pat",
				ADO_SAFETY_LEVEL: "open",
				ADO_PAT: "fake-token",
			},
			() => {
				const config = resolveConfig();
				assert.equal(config.orgUrl, "https://dev.azure.com/myorg");
				assert.equal(config.project, "MyProject");
				assert.equal(config.authMethod, "pat");
				assert.equal(config.safetyLevel, "open");
			},
		);
	});

	it("trims trailing slashes from orgUrl", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg/",
				ADO_PROJECT: "MyProject",
			},
			() => {
				const config = resolveConfig();
				assert.equal(config.orgUrl, "https://dev.azure.com/myorg");
			},
		);
	});

	it("applies defaults for optional fields", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
			},
			() => {
				const config = resolveConfig();
				assert.equal(config.authMethod, "auto");
				assert.equal(config.safetyLevel, "confirm");
				assert.equal(config.defaultWorkItemType, "User Story");
				assert.equal(config.maxQueryResults, 100);
				assert.equal(config.autocomplete, true);
				assert.equal(config.mock, false);
			},
		);
	});

	it("respects ADO_MOCK=1", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
				ADO_MOCK: "1",
			},
			() => {
				const config = resolveConfig();
				assert.equal(config.mock, true);
			},
		);
	});

	it("respects ADO_MOCK=true", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
				ADO_MOCK: "true",
			},
			() => {
				const config = resolveConfig();
				assert.equal(config.mock, true);
			},
		);
	});

	it("ignores invalid auth method values", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
				ADO_AUTH_METHOD: "invalid-method",
			},
			() => {
				const config = resolveConfig();
				// Falls back to default
				assert.equal(config.authMethod, "auto");
			},
		);
	});

	it("ignores invalid safety level values", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
				ADO_SAFETY_LEVEL: "anything",
			},
			() => {
				const config = resolveConfig();
				// Falls back to default
				assert.equal(config.safetyLevel, "confirm");
			},
		);
	});

	it("case-insensitive for auth method and safety level", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
				ADO_AUTH_METHOD: "PAT",
				ADO_SAFETY_LEVEL: "READONLY",
			},
			() => {
				const config = resolveConfig();
				assert.equal(config.authMethod, "pat");
				assert.equal(config.safetyLevel, "readonly");
			},
		);
	});
});

describe("tryResolveConfig", () => {
	it("returns undefined when config is invalid", () => {
		withEnv({ ADO_ORG_URL: undefined, ADO_PROJECT: undefined }, () => {
			assert.equal(tryResolveConfig(), undefined);
		});
	});

	it("returns config when valid", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
			},
			() => {
				const config = tryResolveConfig();
				assert.ok(config);
				assert.equal(config.orgUrl, "https://dev.azure.com/myorg");
			},
		);
	});
});

describe("resolveConfigForDoctor", () => {
	it("reports errors when required fields are missing", () => {
		withEnv({ ADO_ORG_URL: undefined, ADO_PROJECT: undefined }, () => {
			const report = resolveConfigForDoctor();
			assert.equal(report.config, undefined);
			assert.equal(report.errors.length, 2);
		});
	});

	it("reports warning when PAT not set for pat/auto auth", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
				ADO_AUTH_METHOD: "pat",
				ADO_PAT: undefined,
			},
			() => {
				const report = resolveConfigForDoctor();
				assert.ok(report.config);
				assert.equal(report.config.authMethod, "pat");
				assert(report.warnings.some((w) => w.includes("ADO_PAT")));
			},
		);
	});

	it("returns clean report when everything is configured", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
				ADO_AUTH_METHOD: "pat",
				ADO_PAT: "fake-token",
			},
			() => {
				const report = resolveConfigForDoctor();
				assert.ok(report.config);
				assert.equal(report.errors.length, 0);
				assert.equal(report.warnings.length, 0);
			},
		);
	});
});
