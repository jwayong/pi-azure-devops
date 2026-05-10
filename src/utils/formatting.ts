/**
 * Work item → readable text formatting utilities.
 *
 * Types are inferred from azure-devops-node-api API return types
 * to avoid deep path import issues with Node16 module resolution.
 */

import type { IWorkItemTrackingApi } from "azure-devops-node-api/WorkItemTrackingApi";

/** Inferred types from the ADO API */
type WorkItem = NonNullable<Awaited<ReturnType<IWorkItemTrackingApi["getWorkItem"]>>>;
type WorkItemType = NonNullable<Awaited<ReturnType<IWorkItemTrackingApi["getWorkItemType"]>>>;
type CommentList = NonNullable<Awaited<ReturnType<IWorkItemTrackingApi["getComments"]>>>;

/**
 * Format a single work item into readable text.
 */
export function formatWorkItem(wi: WorkItem): string {
	const fields = (wi.fields ?? {}) as Record<string, unknown>;
	const lines: string[] = [];

	lines.push(`# Work Item ${wi.id}: ${fields["System.Title"] ?? "(untitled)"}`);
	lines.push(`- **Type:** ${fields["System.WorkItemType"] ?? "Unknown"}`);
	lines.push(`- **State:** ${fields["System.State"] ?? "Unknown"}`);
	lines.push(`- **Reason:** ${fields["System.Reason"] ?? ""}`);

	const assigned = fields["System.AssignedTo"];
	if (assigned && typeof assigned === "object" && "displayName" in (assigned as object)) {
		lines.push(`- **Assigned To:** ${(assigned as { displayName: string }).displayName}`);
	} else if (assigned) {
		lines.push(`- **Assigned To:** ${String(assigned)}`);
	} else {
		lines.push(`- **Assigned To:** (unassigned)`);
	}

	if (fields["System.AreaPath"]) lines.push(`- **Area Path:** ${fields["System.AreaPath"]}`);
	if (fields["System.IterationPath"]) lines.push(`- **Iteration Path:** ${fields["System.IterationPath"]}`);
	if (fields["System.Priority"]) lines.push(`- **Priority:** ${fields["System.Priority"]}`);
	if (fields["Microsoft.VSTS.Common.Severity"]) lines.push(`- **Severity:** ${fields["Microsoft.VSTS.Common.Severity"]}`);

	if (fields["System.Description"]) {
		lines.push("");
		lines.push("## Description");
		lines.push(String(fields["System.Description"]));
	}

	if (fields["System.Tags"]) {
		lines.push("");
		lines.push(`**Tags:** ${fields["System.Tags"]}`);
	}

	if (wi.url) {
		lines.push("");
		lines.push(`**URL:** ${wi.url}`);
	}

	return lines.join("\n");
}

/**
 * Format a work item summary (compact, for lists).
 */
export function formatWorkItemSummary(wi: WorkItem): string {
	const fields = (wi.fields ?? {}) as Record<string, unknown>;
	const type = fields["System.WorkItemType"] ?? "?";
	const state = fields["System.State"] ?? "?";
	const title = fields["System.Title"] ?? "(untitled)";
	return `#${wi.id} [${type}] [${state}] ${title}`;
}

/**
 * Format a list of work items.
 */
export function formatWorkItemList(workItems: WorkItem[]): string {
	if (workItems.length === 0) return "No work items found.";
	return workItems.map(formatWorkItemSummary).join("\n");
}

/**
 * Format a work item type.
 */
export function formatWorkItemType(wit: WorkItemType): string {
	const lines: string[] = [];
	lines.push(`**${wit.name}** (${wit.referenceName})`);
	if (wit.description) lines.push(`  ${wit.description}`);
	if (wit.states && wit.states.length > 0) {
		lines.push(`  States: ${wit.states.map((s: { name?: string }) => s.name ?? "").join(", ")}`);
	}
	return lines.join("\n");
}

/**
 * Format a list of work item types.
 */
export function formatWorkItemTypeList(types: WorkItemType[]): string {
	if (types.length === 0) return "No work item types found.";
	return types.map(formatWorkItemType).join("\n");
}

/**
 * Format comments on a work item.
 */
export function formatComments(commentList: CommentList): string {
	const comments = commentList.comments ?? [];
	if (comments.length === 0) return "No comments.";

	const lines: string[] = [];
	for (const c of comments) {
		const author = c.createdBy?.displayName ?? "Unknown";
		const date = c.createdDate ? new Date(c.createdDate).toISOString().slice(0, 10) : "";
		lines.push(`**${author}** (${date}):`);
		lines.push(c.text ?? "(empty)");
		lines.push("");
	}
	return lines.join("\n");
}

/**
 * Format revision history.
 */
export function formatRevisions(revisions: WorkItem[]): string {
	if (revisions.length === 0) return "No revisions found.";

	const lines: string[] = [];
	for (const rev of revisions) {
		const fields = (rev.fields ?? {}) as Record<string, unknown>;
		const revNum = rev.rev ?? "?";
		const changedBy = fields["System.ChangedBy"];
		const author = changedBy && typeof changedBy === "object" && "displayName" in (changedBy as object)
			? (changedBy as { displayName: string }).displayName
			: String(changedBy ?? "Unknown");
		const changedDate = fields["System.ChangedDate"]
			? new Date(String(fields["System.ChangedDate"])).toISOString().slice(0, 19)
			: "";

		lines.push(`## Rev ${revNum} — ${author} (${changedDate})`);

		for (const [key, value] of Object.entries(fields)) {
			if (key.startsWith("System.") || key.startsWith("Microsoft.VSTS.")) {
				lines.push(`  ${key}: ${formatFieldValue(value)}`);
			}
		}
		lines.push("");
	}
	return lines.join("\n");
}

function formatFieldValue(value: unknown): string {
	if (value === null || value === undefined) return "(empty)";
	if (typeof value === "object" && "displayName" in (value as object)) {
		return (value as { displayName: string }).displayName;
	}
	return String(value);
}

// ---------------------------------------------------------------------------
// Team formatting
// ---------------------------------------------------------------------------

/** A team from CoreApi.getTeams() */
interface TeamLike {
	id?: string;
	name?: string;
	description?: string;
	url?: string;
}

export function formatTeam(team: TeamLike): string {
	const lines: string[] = [];
	lines.push(`**${team.name ?? "Unknown"}** (id: ${team.id ?? "?"})`);
	if (team.description) lines.push(`  ${team.description}`);
	if (team.url) lines.push(`  URL: ${team.url}`);
	return lines.join("\n");
}

export function formatTeamList(teams: TeamLike[]): string {
	if (teams.length === 0) return "No teams found.";
	return teams.map(formatTeam).join("\n");
}

// ---------------------------------------------------------------------------
// Board formatting
// ---------------------------------------------------------------------------

/** A board reference from WorkApi.getBoards() */
interface BoardRefLike {
	id?: string;
	name?: string;
	url?: string;
}

/** A full board from WorkApi.getBoard() */
interface BoardLike {
	id?: string;
	name?: string;
	url?: string;
	canEdit?: boolean;
	columns?: Array<{
		id?: string;
		name?: string;
		columnType?: number;
		itemLimit?: number | null;
		stateMappings?: Record<string, string>;
	}>;
	rows?: Array<{ id?: string; name?: string }>;
}

const COLUMN_TYPE_NAMES: Record<number, string> = {
	0: "Incoming",
	1: "InProgress",
	2: "Outgoing",
};

export function formatBoardRef(board: BoardRefLike): string {
	return `**${board.name ?? "Unknown"}** (id: ${board.id ?? "?"})${board.url ? ` — ${board.url}` : ""}`;
}

export function formatBoardList(boards: BoardRefLike[]): string {
	if (boards.length === 0) return "No boards found.";
	return boards.map(formatBoardRef).join("\n");
}

export function formatBoard(board: BoardLike): string {
	const lines: string[] = [];
	lines.push(`# Board: ${board.name ?? "Unknown"} (id: ${board.id ?? "?"})`);
	if (board.canEdit !== undefined) lines.push(`- **Editable:** ${board.canEdit ? "Yes" : "No"}`);

	const columns = board.columns ?? [];
	if (columns.length > 0) {
		lines.push("");
		lines.push("## Columns");
		for (const col of columns) {
		const typeLabel = COLUMN_TYPE_NAMES[col.columnType ?? -1] ?? "Unknown";
		const limitStr = col.itemLimit != null ? ` (limit: ${col.itemLimit})` : "";
		lines.push(`- **${col.name ?? "?"}** [${typeLabel}]${limitStr}`);
		if (col.stateMappings) {
			const mappings = Object.entries(col.stateMappings)
				.map(([type, state]) => `${type} → ${state}`)
				.join(", ");
			lines.push(`  Mappings: ${mappings}`);
		}
		}
	}

	const rows = board.rows ?? [];
	if (rows.length > 0) {
		lines.push("");
		lines.push(`## Rows (${rows.length})`);
		for (const row of rows) {
			lines.push(`- ${row.name || "(default)"}`);
		}
	}

	if (board.url) {
		lines.push("");
		lines.push(`**URL:** ${board.url}`);
	}

	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Iteration formatting
// ---------------------------------------------------------------------------

interface IterationLike {
	id?: string;
	name?: string;
	path?: string;
	attributes?: {
		startDate?: string;
		finishDate?: string;
		timeFrame?: string;
	};
	url?: string;
}

const TIMEFRAME_LABELS: Record<string, string> = {
	current: "🔵 Current",
	past: "⚪ Past",
	future: "🟢 Future",
};

export function formatIteration(iteration: IterationLike): string {
	const attrs = iteration.attributes ?? {};
	const tf = attrs.timeFrame ?? "";
	const tfLabel = TIMEFRAME_LABELS[tf.toLowerCase()] ?? tf;
	const start = attrs.startDate ? new Date(attrs.startDate).toISOString().slice(0, 10) : "?";
	const end = attrs.finishDate ? new Date(attrs.finishDate).toISOString().slice(0, 10) : "?";

	const lines: string[] = [];
	lines.push(`**${iteration.name ?? "Unknown"}** (id: ${iteration.id ?? "?"}) ${tfLabel}`);
	lines.push(`  ${start} → ${end}`);
	if (iteration.path) lines.push(`  Path: ${iteration.path}`);
	return lines.join("\n");
}

export function formatIterationList(iterations: IterationLike[]): string {
	if (iterations.length === 0) return "No iterations found.";
	return iterations.map(formatIteration).join("\n");
}

// ---------------------------------------------------------------------------
// Capacity formatting
// ---------------------------------------------------------------------------

interface CapacityLike {
	teamMembers?: Array<{
		teamMember?: {
			displayName?: string;
			uniqueName?: string;
		};
		activities?: Array<{
			name?: string;
			capacityPerDay?: number;
		}>;
		daysOff?: Array<{
			start?: string;
			end?: string;
		}>;
	}>;
	totalCapacityPerDay?: number;
	totalDaysOff?: number;
}

export function formatCapacity(capacity: CapacityLike): string {
	const members = capacity.teamMembers ?? [];
	const lines: string[] = [];

	lines.push(`# Team Capacity`);
	lines.push(`- **Total capacity:** ${capacity.totalCapacityPerDay ?? 0} hours/day`);
	lines.push(`- **Total days off:** ${capacity.totalDaysOff ?? 0}`);

	if (members.length > 0) {
		lines.push("");
		lines.push("## Team Members");
		for (const m of members) {
			const name = m.teamMember?.displayName ?? "Unknown";
			const activities = m.activities ?? [];
			const actStr = activities
				.map((a) => `${a.name ?? "?"}: ${a.capacityPerDay ?? 0}h/day`)
				.join(", ");
			const daysOff = m.daysOff ?? [];
			const offStr = daysOff.length > 0
				? daysOff
					.map((d) => {
						const s = d.start ? new Date(d.start).toISOString().slice(0, 10) : "?";
						const e = d.end ? new Date(d.end).toISOString().slice(0, 10) : "?";
						return s === e ? s : `${s}–${e}`;
					})
					.join(", ")
				: "none";

			lines.push(`- **${name}**: ${actStr || "no activities"}`);
			lines.push(`  Days off: ${offStr}`);
		}
	}

	return lines.join("\n");
}
