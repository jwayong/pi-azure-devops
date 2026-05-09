/**
 * WebApi connection factory.
 * Creates and caches authenticated connections to Azure DevOps.
 */

import { WebApi } from "azure-devops-node-api";
import type { AdoConfig } from "../config/index.js";
import { resolveAuth } from "../auth/index.js";

// Cache per session — keyed by orgUrl
const connections = new Map<string, WebApi>();

/**
 * Get or create an authenticated WebApi connection.
 * Cached by orgUrl so we reuse connections within a session.
 */
export async function getConnection(
	config: AdoConfig,
	signal?: AbortSignal,
): Promise<WebApi> {
	const cached = connections.get(config.orgUrl);
	if (cached) return cached;

	const authResult = await resolveAuth(config, signal);
	const connection = new WebApi(config.orgUrl, authResult.handler);

	connections.set(config.orgUrl, connection);
	return connection;
}

/**
 * Get the WorkItemTracking API client.
 */
export async function getWorkItemTrackingApi(
	config: AdoConfig,
	signal?: AbortSignal,
) {
	const connection = await getConnection(config, signal);
	return connection.getWorkItemTrackingApi();
}

/**
 * Clear cached connections (useful after auth failure retry).
 */
export function clearConnectionCache(): void {
	connections.clear();
}
