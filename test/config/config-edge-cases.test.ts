import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveConfig, ConfigError } from "../../src/config/index.js";

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

describe("resolveConfig edge cases", () => {
	it("trims multiple trailing slashes", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg///",
				ADO_PROJECT: "MyProject",
			},
			() => {
				const config = resolveConfig();
				assert.equal(config.orgUrl, "https://dev.azure.com/myorg");
			},
		);
	});

	it("handles whitespace in auth method", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
				ADO_AUTH_METHOD: "  pat  ",
			},
			() => {
				const config = resolveConfig();
				assert.equal(config.authMethod, "pat");
			},
		);
	});

	it("handles mixed case safety level", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
				ADO_SAFETY_LEVEL: "ReAdOnLy",
			},
			() => {
				const config = resolveConfig();
				assert.equal(config.safetyLevel, "readonly");
			},
		);
	});

	it("does not enable mock for ADO_MOCK=0", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
				ADO_MOCK: "0",
			},
			() => {
				const config = resolveConfig();
				assert.equal(config.mock, false);
			},
		);
	});

	it("does not enable mock for ADO_MOCK=false", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
				ADO_MOCK: "false",
			},
			() => {
				const config = resolveConfig();
				assert.equal(config.mock, false);
			},
		);
	});

	it("resolves with azure-cli auth method", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
				ADO_AUTH_METHOD: "azure-cli",
			},
			() => {
				const config = resolveConfig();
				assert.equal(config.authMethod, "azure-cli");
			},
		);
	});

	it("ConfigError has correct name property", () => {
		withEnv({ ADO_ORG_URL: undefined, ADO_PROJECT: undefined }, () => {
			try {
				resolveConfig();
				assert.fail("Should have thrown");
			} catch (err) {
				assert(err instanceof ConfigError);
				assert.equal(err.name, "ConfigError");
				assert.ok(err.message.includes("Missing required"));
			}
		});
	});

	it("defaults autocomplete to true", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
			},
			() => {
				const config = resolveConfig();
				assert.equal(config.autocomplete, true);
			},
		);
	});

	it("defaults maxQueryResults to 100", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
			},
			() => {
				const config = resolveConfig();
				assert.equal(config.maxQueryResults, 100);
			},
		);
	});

	it("defaults defaultWorkItemType to User Story", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
			},
			() => {
				const config = resolveConfig();
				assert.equal(config.defaultWorkItemType, "User Story");
			},
		);
	});

	it("resolves confirm safety level", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
				ADO_SAFETY_LEVEL: "confirm",
			},
			() => {
				const config = resolveConfig();
				assert.equal(config.safetyLevel, "confirm");
			},
		);
	});

	it("resolves open safety level", () => {
		withEnv(
			{
				ADO_ORG_URL: "https://dev.azure.com/myorg",
				ADO_PROJECT: "MyProject",
				ADO_SAFETY_LEVEL: "open",
			},
			() => {
				const config = resolveConfig();
				assert.equal(config.safetyLevel, "open");
			},
		);
	});
});
