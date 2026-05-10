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
	formatTeamList,
	formatBoardList,
	formatBoard,
	formatIterationList,
	formatCapacity,
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

interface TeamsFixture {
	teams: Array<{
		id: string;
		name: string;
		description?: string;
		url?: string;
	}>;
}

interface BoardsFixture {
	boards: Record<string, Array<{
		id: string;
		name: string;
		url?: string;
	}>>;
}

interface BoardDetailFixture {
	boardDetails: Record<string, {
		id?: string;
		name?: string;
		url?: string;
		canEdit?: boolean;
		revision?: number;
		columns?: Array<{
			id?: string;
			name?: string;
			columnType?: number;
			itemLimit?: number | null;
			stateMappings?: Record<string, string>;
		}>;
		rows?: Array<{ id?: string; name?: string }>;
	}>;
}

interface IterationsFixture {
	iterations: Record<string, Array<{
		id: string;
		name: string;
		path?: string;
		attributes?: {
			startDate?: string;
			finishDate?: string;
			timeFrame?: string;
		};
		url?: string;
	}>>;
}

interface IterationWorkItemsFixture {
	iterationWorkItems: Record<string, {
		workItemRelations?: Array<{
			rel?: string;
			source?: { id?: number } | null;
			target?: { id?: number };
		}>;
	}>;
}

interface CapacityFixture {
	capacities: Record<string, {
		teamMembers?: Array<{
			teamMember?: {
				displayName?: string;
				uniqueName?: string;
			};
			activities?: Array<{ name?: string; capacityPerDay?: number }>;
			daysOff?: Array<{ start?: string; end?: string }>;
		}>;
		totalCapacityPerDay?: number;
		totalDaysOff?: number;
	}>;
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

let _teams: TeamsFixture | undefined;
let _boards: BoardsFixture | undefined;
let _boardDetail: BoardDetailFixture | undefined;
let _iterations: IterationsFixture | undefined;
let _iterationWorkItems: IterationWorkItemsFixture | undefined;
let _capacity: CapacityFixture | undefined;

function getTeams(): TeamsFixture {
	return (_teams ??= loadFixture<TeamsFixture>("teams.json"));
}
function getBoards(): BoardsFixture {
	return (_boards ??= loadFixture<BoardsFixture>("boards.json"));
}
function getBoardDetail(): BoardDetailFixture {
	return (_boardDetail ??= loadFixture<BoardDetailFixture>("board-detail.json"));
}
function getIterations(): IterationsFixture {
	return (_iterations ??= loadFixture<IterationsFixture>("iterations.json"));
}
function getIterationWorkItems(): IterationWorkItemsFixture {
	return (_iterationWorkItems ??= loadFixture<IterationWorkItemsFixture>("iteration-work-items.json"));
}
function getCapacity(): CapacityFixture {
	return (_capacity ??= loadFixture<CapacityFixture>("capacity.json"));
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
 * Mock: list teams in the project.
 */
export function mockListTeams(): ToolResult {
	const data = getTeams();
	return textResult(
		`Teams (mock mode):\n\n${formatTeamList(data.teams as any)}`,
		{ count: data.teams.length, mock: true },
	);
}

/**
 * Mock: list boards for a team.
 */
export function mockListBoards(team: string): ToolResult {
	const data = getBoards();
	const boards = data.boards[team];
	if (!boards) {
		return errorResult(`No boards found for team "${team}" (mock mode)`);
	}
	return textResult(
		`Boards for ${team} (mock mode):\n\n${formatBoardList(boards as any)}`,
		{ team, count: boards.length, mock: true },
	);
}

/**
 * Mock: get full board detail.
 */
export function mockGetBoard(team: string, boardId: string): ToolResult {
	const data = getBoardDetail();
	const key = `${team}:${boardId}`;
	const board = data.boardDetails[key];
	if (!board) {
		return errorResult(`Board "${boardId}" not found for team "${team}" (mock mode)`);
	}
	return textResult(
		`Board detail (mock mode):\n\n${formatBoard(board as any)}`,
		{ team, boardId, mock: true },
	);
}

/**
 * Mock: list iterations for a team.
 */
export function mockListIterations(team: string, timeframe?: string): ToolResult {
	const data = getIterations();
	const iterations = data.iterations[team];
	if (!iterations) {
		return errorResult(`No iterations found for team "${team}" (mock mode)`);
	}

	let filtered = iterations;
	if (timeframe) {
		const tf = timeframe.toLowerCase();
		filtered = iterations.filter(
			(it) => it.attributes?.timeFrame?.toLowerCase() === tf,
		);
	}

	return textResult(
		`Iterations for ${team} (mock mode):\n\n${formatIterationList(filtered as any)}`,
		{ team, count: filtered.length, mock: true },
	);
}

/**
 * Mock: get work items in an iteration.
 */
export function mockGetIterationWorkItems(team: string, iterationId: string): ToolResult {
	const data = getIterationWorkItems();
	const key = `${team}:${iterationId}`;
	const items = data.iterationWorkItems[key];
	if (!items || !items.workItemRelations || items.workItemRelations.length === 0) {
		return textResult(
			`No work items in iteration ${iterationId} for ${team} (mock mode)`,
			{ team, iterationId, count: 0, mock: true },
		);
	}

	// Collect target IDs and format
	const workItemData = getWorkItems();
	const ids = items.workItemRelations
		.filter((r) => r.target?.id)
		.map((r) => r.target!.id!);
	const matched = workItemData.workItems.filter((wi) => ids.includes(wi.id));

	const lines = [`Work items in iteration ${iterationId} for ${team} (mock mode):`, ""];
	if (matched.length > 0) {
		lines.push(formatWorkItemList(matched as any));
	} else {
		lines.push(`Work item IDs: ${ids.join(", ")}`);
	}

	return textResult(lines.join("\n"), { team, iterationId, count: ids.length, mock: true });
}

/**
 * Mock: get sprint capacity.
 */
export function mockGetCapacity(team: string, iterationId: string): ToolResult {
	const data = getCapacity();
	const key = `${team}:${iterationId}`;
	const cap = data.capacities[key];
	if (!cap) {
		return errorResult(`No capacity data for ${team} / ${iterationId} (mock mode)`);
	}
	return textResult(
		`Sprint capacity (mock mode):\n\n${formatCapacity(cap as any)}`,
		{ team, iterationId, mock: true },
	);
}

/**
 * Mock: set board columns — returns confirmation.
 */
export function mockSetBoardColumns(
	team: string,
	boardId: string,
	columns: Array<{ name: string; itemLimit?: number }>,
): ToolResult {
	const colNames = columns.map((c) => c.name).join(" → ");
	return textResult(
		[
			`✅ Updated columns on board "${boardId}" for ${team} (mock mode)`,
			"",
			`Columns: ${colNames}`,
			"",
			"⚠️ This is mock data — no board was actually modified.",
		].join("\n"),
		{ team, boardId, mock: true },
	);
}

/**
 * Mock: set iteration — add or remove from team.
 */
export function mockSetIteration(
	team: string,
	iterationId: string,
	operation: "add" | "remove",
): ToolResult {
	const verb = operation === "add" ? "Added" : "Removed";
	const prep = operation === "add" ? "to" : "from";
	return textResult(
		[
			`✅ ${verb} iteration ${iterationId} ${prep} ${team} (mock mode)`,
			"",
			"⚠️ This is mock data — no iteration was actually modified.",
		].join("\n"),
		{ team, iterationId, operation, mock: true },
	);
}

/**
 * Mock: set capacity — returns confirmation.
 */
export function mockSetCapacity(
	team: string,
	iterationId: string,
	capacities: Array<{ teamMemberId: string }>,
): ToolResult {
	return textResult(
		[
			`✅ Set capacity for ${capacities.length} member(s) in ${team} / ${iterationId} (mock mode)`,
			"",
			"⚠️ This is mock data — no capacity was actually modified.",
		].join("\n"),
		{ team, iterationId, memberCount: capacities.length, mock: true },
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
	_teams = undefined;
	_boards = undefined;
	_boardDetail = undefined;
	_iterations = undefined;
	_iterationWorkItems = undefined;
	_capacity = undefined;
}
