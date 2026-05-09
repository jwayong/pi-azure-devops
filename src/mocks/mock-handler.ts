/**
 * Mock handler — returns fixture data for offline development and testing.
 *
 * Each tool-specific method returns data through the same formatting
 * pipeline as the live tools, so mock output looks identical to real output.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
	formatWorkItem,
	formatWorkItemList,
	formatWorkItemTypeList,
	formatComments,
	formatRevisions,
} from "../utils/formatting.js";
import { textResult, errorResult, type ToolResult } from "../tools/shared.js";

// ---------------------------------------------------------------------------
// Fixture loading
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "fixtures");

function loadFixture<T>(name: string): T {
	const raw = readFileSync(join(FIXTURES_DIR, name), "utf-8");
	return JSON.parse(raw) as T;
}

interface FixtureData {
	workItems: Array<{
		id: number;
		rev?: number;
		fields?: Record<string, unknown>;
		relations?: Array<Record<string, unknown>>;
		url?: string;
	}>;
}

interface TypesFixture {
	workItemTypes: Array<{
		name: string;
		referenceName: string;
		description?: string;
		color?: string;
		states?: Array<{ name: string; color: string }>;
	}>;
}

interface CommentsFixture {
	comments: Record<string, {
		comments: Array<{
			id: number;
			createdBy?: { displayName: string; uniqueName: string };
			createdDate?: string;
			text?: string;
		}>;
		continuationToken?: string | null;
		totalCount?: number;
	}>;
}

interface RevisionsFixture {
	revisions: Record<string, Array<{
		rev?: number;
		fields?: Record<string, unknown>;
	}>>;
}

// Lazy-load fixtures
let _workItems: FixtureData | undefined;
let _types: TypesFixture | undefined;
let _comments: CommentsFixture | undefined;
let _revisions: RevisionsFixture | undefined;

function getWorkItems(): FixtureData {
	return (_workItems ??= loadFixture<FixtureData>("work-items.json"));
}

function getTypes(): TypesFixture {
	return (_types ??= loadFixture<TypesFixture>("work-item-types.json"));
}

function getComments(): CommentsFixture {
	return (_comments ??= loadFixture<CommentsFixture>("comments.json"));
}

function getRevisions(): RevisionsFixture {
	return (_revisions ??= loadFixture<RevisionsFixture>("revisions.json"));
}

// ---------------------------------------------------------------------------
// Mock handlers per tool
// ---------------------------------------------------------------------------

/**
 * Mock: get a single work item by ID.
 */
export function mockGetWorkItem(id: number): ToolResult {
	const data = getWorkItems();
	const wi = data.workItems.find((w) => w.id === id);
	if (!wi) {
		return errorResult(`Work item #${id} not found (mock mode)`);
	}
	return textResult(formatWorkItem(wi as any), { id: wi.id, mock: true });
}

/**
 * Mock: query work items by simple WIQL-like filtering.
 *
 * Supports a subset of WIQL for mock purposes:
 * - WHERE [System.State] = 'Active'
 * - WHERE [System.WorkItemType] = 'Bug'
 * - WHERE [System.AssignedTo] = @me
 *
 * Multiple conditions are ANDed. Returns all if no conditions match.
 */
export function mockQueryWorkItems(query: string, top: number = 100): ToolResult {
	const data = getWorkItems();
	let results = [...data.workItems];

	// Parse simple WHERE conditions
	const conditionRegex = /\[([^\]]+)\]\s*=\s*'([^']+)'/g;
	let match: RegExpExecArray | null;
	const conditions: Array<{ field: string; value: string }> = [];

	while ((match = conditionRegex.exec(query)) !== null) {
		conditions.push({ field: match[1], value: match[2] });
	}

	// Also check for state/type in plain text (loose matching for LLM queries)
	if (query.toLowerCase().includes("active") && !conditions.some((c) => c.field === "System.State")) {
		conditions.push({ field: "System.State", value: "Active" });
	}
	if (query.toLowerCase().includes("bug") && !conditions.some((c) => c.field === "System.WorkItemType")) {
		conditions.push({ field: "System.WorkItemType", value: "Bug" });
	}
	if (query.toLowerCase().includes("closed") && !conditions.some((c) => c.field === "System.State")) {
		conditions.push({ field: "System.State", value: "Closed" });
	}

	// Apply filters
	for (const cond of conditions) {
		results = results.filter((wi) => {
			const fields = (wi.fields ?? {}) as Record<string, unknown>;
			const val = fields[cond.field];
			if (val === undefined || val === null) return false;
			return String(val).toLowerCase() === cond.value.toLowerCase();
		});
	}

	results = results.slice(0, top);

	return textResult(
		`Found ${results.length} work item(s) (mock mode):\n\n${formatWorkItemList(results as any)}`,
		{ count: results.length, mock: true },
	);
}

/**
 * Mock: list work item types.
 */
export function mockListWorkItemTypes(): ToolResult {
	const data = getTypes();
	return textResult(
		`Work item types (mock mode):\n\n${formatWorkItemTypeList(data.workItemTypes as any)}`,
		{ count: data.workItemTypes.length, mock: true },
	);
}

/**
 * Mock: get comments for a work item.
 */
export function mockGetWorkItemComments(workItemId: number): ToolResult {
	const data = getComments();
	const commentData = data.comments[String(workItemId)];
	if (!commentData) {
		return textResult(
			`No comments found for work item #${workItemId} (mock mode)`,
			{ workItemId, count: 0, mock: true },
		);
	}
	return textResult(
		`Comments on #${workItemId} (mock mode):\n\n${formatComments(commentData as any)}`,
		{ workItemId, count: commentData.comments.length, mock: true },
	);
}

/**
 * Mock: get revisions for a work item.
 */
export function mockGetWorkItemRevisions(workItemId: number): ToolResult {
	const data = getRevisions();
	const revisions = data.revisions[String(workItemId)];
	if (!revisions || revisions.length === 0) {
		return textResult(
			`No revisions found for work item #${workItemId} (mock mode)`,
			{ workItemId, count: 0, mock: true },
		);
	}
	return textResult(
		`Revision history for #${workItemId} (mock mode):\n\n${formatRevisions(revisions as any)}`,
		{ workItemId, count: revisions.length, mock: true },
	);
}

/**
 * Mock: create a work item — returns a simulated created item.
 */
export function mockCreateWorkItem(
	type: string,
	title: string,
	_description?: string,
	_fields?: Record<string, string>,
): ToolResult {
	const newId = 200 + Math.floor(Math.random() * 100);
	return textResult(
		[
			`✅ Created work item #${newId} (mock mode)`,
			"",
			`- **Type:** ${type}`,
			`- **Title:** ${title}`,
			`- **State:** New`,
			`- **URL:** https://dev.azure.com/testorg/_apis/wit/workItems/${newId}`,
			"",
			"⚠️ This is mock data — no work item was actually created.",
		].join("\n"),
		{ id: newId, type, title, mock: true },
	);
}

/**
 * Mock: update a work item — returns a simulated updated item.
 */
export function mockUpdateWorkItem(
	id: number,
	fields: Record<string, string>,
): ToolResult {
	const data = getWorkItems();
	const wi = data.workItems.find((w) => w.id === id);
	if (!wi) {
		return errorResult(`Work item #${id} not found (mock mode)`);
	}

	const lines: string[] = [
		`✅ Updated work item #${id} (mock mode)`,
		"",
		"Changed fields:",
	];
	for (const [key, value] of Object.entries(fields)) {
		lines.push(`- **${key}:** ${value}`);
	}
	lines.push("");
	lines.push("⚠️ This is mock data — no work item was actually updated.");

	return textResult(lines.join("\n"), { id, fields, mock: true });
}

/**
 * Mock: add a comment — returns confirmation.
 */
export function mockAddWorkItemComment(
	workItemId: number,
	text: string,
): ToolResult {
	return textResult(
		[
			`✅ Added comment to work item #${workItemId} (mock mode)`,
			"",
			`> ${text}`,
			"",
			"⚠️ This is mock data — no comment was actually added.",
		].join("\n"),
		{ workItemId, mock: true },
	);
}

/**
 * Mock: manage work item links — returns confirmation.
 */
export function mockManageWorkItemLinks(
	workItemId: number,
	operation: "add" | "remove",
	relationType: string,
	targetId: number,
): ToolResult {
	const verb = operation === "add" ? "Added" : "Removed";
	return textResult(
		[
			`✅ ${verb} ${relationType} link ${operation === "add" ? "to" : "from"} #${workItemId} → #${targetId} (mock mode)`,
			"",
			"⚠️ This is mock data — no link was actually modified.",
		].join("\n"),
		{ workItemId, operation, relationType, targetId, mock: true },
	);
}

/**
 * Clear cached fixtures (useful for testing).
 */
export function clearFixtureCache(): void {
	_workItems = undefined;
	_types = undefined;
	_comments = undefined;
	_revisions = undefined;
}
