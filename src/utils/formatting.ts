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
