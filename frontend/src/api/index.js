/**
 * Centralized Frappe REST API helpers for Task Flow.
 * NOTE: frappeRequest already unwraps data.message in its transformResponse,
 * so the return value IS the payload — never do res.message here.
 */
import { frappeRequest } from "frappe-ui";

// ── Field lists ────────────────────────────────────────────────────────────────
export const TASK_FIELDS = [
	"name", "subject", "status", "priority", "project",
	"exp_start_date", "exp_end_date", "progress", "color",
	"_assign", "cover_image", "watchers", "depends_on_tasks",
	"modified",
];

export const TASK_STATUSES = [
	"Open", "Working", "Pending Review", "Overdue", "Completed", "Cancelled",
];

export const TASK_PRIORITIES = ["Urgent", "High", "Medium", "Low"];

// ── Tasks ──────────────────────────────────────────────────────────────────────
export async function getTasks(filters = [], { limit = 500, orderBy = "exp_end_date asc" } = {}) {
	const res = await frappeRequest({
		url: "/api/method/frappe.client.get_list",
		params: {
			doctype: "Task",
			fields: JSON.stringify(TASK_FIELDS),
			filters: JSON.stringify(filters),
			order_by: orderBy,
			limit_page_length: limit,
		},
	});
	return (Array.isArray(res) ? res : []).map(normalizeTask);
}

/**
 * Same as getTasks but returns a description_preview field (HTML stripped,
 * truncated to ~140 chars). Routed through a custom whitelist endpoint
 * because frappe.client.get_list blocks long-text fields.
 */
export async function getTasksWithPreview(filters = [], { limit = 500, orderBy = "exp_end_date asc" } = {}) {
	const res = await frappeRequest({
		url: "/api/method/task_flow.api.get_tasks_with_preview",
		params: {
			filters: JSON.stringify(filters),
			limit,
			order_by: orderBy,
		},
	});
	return (Array.isArray(res) ? res : []).map(normalizeTask);
}

export async function bulkUpdateTasks(taskNames, fields) {
	return frappeRequest({
		url: "/api/method/task_flow.api.bulk_update_tasks",
		method: "POST",
		params: {
			task_names: JSON.stringify(taskNames),
			fields:     JSON.stringify(fields),
		},
	});
}

export async function bulkDeleteTasks(taskNames) {
	return frappeRequest({
		url: "/api/method/task_flow.api.bulk_delete_tasks",
		method: "POST",
		params: { task_names: JSON.stringify(taskNames) },
	});
}

export async function getTask(name) {
	const res = await frappeRequest({
		url: "/api/method/frappe.client.get",
		params: { doctype: "Task", name },
	});
	return normalizeTask(res);
}

export async function saveTask(doc) {
	const res = await frappeRequest({
		url: "/api/method/frappe.client.save",
		method: "POST",
		params: { doc: JSON.stringify({ doctype: "Task", ...doc }) },
	});
	return normalizeTask(res);
}

export async function createTask(fields) {
	const res = await frappeRequest({
		url: "/api/method/frappe.client.insert",
		method: "POST",
		params: { doc: JSON.stringify({ doctype: "Task", ...fields }) },
	});
	return normalizeTask(res);
}

export async function uploadFile(file, options = {}) {
	const formData = new FormData();
	formData.append("file", file, file.name);
	formData.append("is_private", options.isPrivate ? "1" : "0");

	if (options.doctype) formData.append("doctype", options.doctype);
	if (options.docname) formData.append("docname", options.docname);
	if (options.fieldname) formData.append("fieldname", options.fieldname);
	if (options.folder) formData.append("folder", options.folder);

	const csrfToken = window.frappe?.csrf_token || window.csrf_token || "";
	const response = await fetch("/api/method/upload_file", {
		method: "POST",
		body: formData,
		credentials: "same-origin",
		headers: csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : undefined,
	});

	const payload = await response.json().catch(() => null);
	if (!response.ok) {
		const message =
			payload?.exception ||
			payload?._error_message ||
			payload?.message ||
			"No se pudo subir el archivo.";
		throw new Error(String(message));
	}

	const result = payload?.message || payload;
	if (!result?.file_url) {
		throw new Error("La subida no devolvio una URL valida.");
	}

	return result;
}

export async function setTaskField(name, fieldname, value) {
	const res = await frappeRequest({
		url: "/api/method/frappe.client.set_value",
		method: "POST",
		params: {
			doctype: "Task",
			name,
			// Dict-style fieldname: Frappe auto-parses the JSON string and calls
			// doc.update(fields), avoiding extra JSON-quote wrapping on strings.
			fieldname: JSON.stringify({ [fieldname]: value ?? "" }),
		},
	});
	return normalizeTask(res);
}

/**
 * Update multiple Task fields in a single HTTP request.
 * Avoids MySQL deadlock that occurs when two set_value calls hit the same
 * document row concurrently (e.g. updating exp_start_date + exp_end_date).
 */
export async function setTaskFields(name, fields) {
	const res = await frappeRequest({
		url: "/api/method/frappe.client.set_value",
		method: "POST",
		params: {
			doctype: "Task",
			name,
			fieldname: JSON.stringify(fields),
		},
	});
	return normalizeTask(res);
}

export async function deleteTask(name) {
	await frappeRequest({
		url: `/api/resource/Task/${name}`,
		method: "DELETE",
	});
}

// ── Assignments ───────────────────────────────────────────────────────────────
// Frappe stores assignments in the ToDo doctype. We use custom Python endpoints
// that create/cancel ToDo docs and keep the _assign field in sync.

export async function addAssignment(taskName, email) {
	return frappeRequest({
		url: "/api/method/task_flow.api.add_task_assignment",
		method: "POST",
		params: { task_name: taskName, email },
	});
}

export async function removeAssignment(taskName, email) {
	return frappeRequest({
		url: "/api/method/task_flow.api.remove_task_assignment",
		method: "POST",
		params: { task_name: taskName, email },
	});
}

export async function getAssignments(doctype, name) {
	const res = await frappeRequest({
		url: "/api/method/task_flow.api.get_doc_assignments",
		params: { doctype, name },
	});
	return Array.isArray(res) ? res.filter(Boolean) : [];
}

// ── Email ──────────────────────────────────────────────────────────────────────
export async function sendTaskEmail(taskName, toEmail, subject, message) {
	return frappeRequest({
		url: "/api/method/task_flow.api.send_task_email",
		method: "POST",
		params: { task_name: taskName, to_email: toEmail, subject, message },
	});
}

// ── Permissions ────────────────────────────────────────────────────────────────
export async function getUserPermissions() {
	return frappeRequest({ url: "/api/method/task_flow.api.get_user_permissions" });
}

// ── Project stats ──────────────────────────────────────────────────────────────
export async function getProjectStats(projectName) {
	return frappeRequest({
		url: "/api/method/task_flow.api.get_project_stats",
		params: { project_name: projectName },
	});
}

// ── Subtasks ───────────────────────────────────────────────────────────────────
export async function getSubtasks(parentTask) {
	const res = await frappeRequest({
		url: "/api/method/frappe.client.get_list",
		params: {
			doctype: "Task",
			fields: JSON.stringify(["name", "subject", "status", "priority", "exp_end_date", "_assign"]),
			filters: JSON.stringify([["parent_task", "=", parentTask]]),
			limit_page_length: 50,
		},
	});
	return Array.isArray(res) ? res : [];
}

// ── Comments ───────────────────────────────────────────────────────────────────
export async function getComments(taskName) {
	const res = await frappeRequest({
		url: "/api/method/frappe.client.get_list",
		params: {
			doctype: "Comment",
			fields: JSON.stringify(["name", "content", "owner", "creation", "comment_type"]),
			filters: JSON.stringify([
				["reference_doctype", "=", "Task"],
				["reference_name", "=", taskName],
				["comment_type", "in", ["Comment", "Updated", "Workflow"]],
			]),
			order_by: "creation asc",
			limit_page_length: 100,
		},
	});
	return Array.isArray(res) ? res : [];
}

export async function addComment(taskName, content) {
	return await frappeRequest({
		url: "/api/method/frappe.client.insert",
		method: "POST",
		params: {
			doc: JSON.stringify({
				doctype: "Comment",
				reference_doctype: "Task",
				reference_name: taskName,
				content,
				comment_type: "Comment",
			}),
		},
	});
}

// ── Projects ───────────────────────────────────────────────────────────────────
const PROJECT_FIELDS = [
	"name", "project_name", "status", "percent_complete",
	"notes", "expected_start_date", "expected_end_date",
	"priority", "department", "company",
];

export async function getProjects() {
	const res = await frappeRequest({
		url: "/api/method/frappe.client.get_list",
		params: {
			doctype: "Project",
			fields: JSON.stringify(PROJECT_FIELDS),
			filters: JSON.stringify([["status", "!=", "Cancelled"]]),
			order_by: "project_name asc",
			limit_page_length: 200,
		},
	});
	return (Array.isArray(res) ? res : []).map(normalizeProject);
}

export async function getProject(name) {
	const res = await frappeRequest({
		url: "/api/method/frappe.client.get",
		params: { doctype: "Project", name },
	});
	return normalizeProject(res);
}

export async function createProject(fields) {
	const res = await frappeRequest({
		url: "/api/method/frappe.client.insert",
		method: "POST",
		params: { doc: JSON.stringify(serializeProjectDoc(fields)) },
	});
	return normalizeProject(res);
}

export async function saveProject(doc) {
	const res = await frappeRequest({
		url: "/api/method/frappe.client.save",
		method: "POST",
		params: { doc: JSON.stringify(serializeProjectDoc(doc)) },
	});
	return normalizeProject(res);
}

export async function deleteProject(name) {
	await frappeRequest({
		url: `/api/resource/Project/${encodeURIComponent(name)}`,
		method: "DELETE",
	});
}

// ── Users ──────────────────────────────────────────────────────────────────────
const _userCache = {};

export async function getUser(email) {
	if (_userCache[email]) return _userCache[email];
	const fallback = { name: email, full_name: email, user_image: null, mobile_no: null, phone: null };
	try {
		const res = await frappeRequest({
			url: "/api/method/task_flow.api.get_user_info",
			params: { email },
		});
		_userCache[email] = res || fallback;
		return _userCache[email];
	} catch {
		return fallback;
	}
}

export async function getSystemUsers() {
	const res = await frappeRequest({
		url: "/api/method/frappe.client.get_list",
		params: {
			doctype: "User",
			fields: JSON.stringify(["name", "full_name", "user_image"]),
			filters: JSON.stringify([["enabled", "=", 1], ["user_type", "=", "System User"]]),
			order_by: "full_name asc",
			limit_page_length: 200,
		},
	});
	return Array.isArray(res) ? res : [];
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function normalizeTask(t) {
	if (!t) return null;
	return {
		...t,
		_assignees: parseAssign(t._assign),
	};
}

function normalizeProject(project) {
	if (!project) return null;
	return {
		...project,
		description: project.description ?? project.notes ?? "",
	};
}

function serializeProjectDoc(doc = {}) {
	const { description, ...rest } = doc;
	return {
		doctype: "Project",
		...rest,
		notes: description ?? doc.notes ?? "",
	};
}

export function parseAssign(raw) {
	if (!raw) return [];
	try { return JSON.parse(raw); } catch { return []; }
}

function parseDateValue(value) {
	if (!value) return null;
	if (value instanceof Date) {
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	const raw = String(value).trim();
	if (!raw) return null;

	const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (match) {
		const [, year, month, day] = match;
		const parsed = new Date(Number(year), Number(month) - 1, Number(day));
		parsed.setHours(0, 0, 0, 0);
		return parsed;
	}

	const parsed = new Date(raw);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfToday() {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return today;
}

function formatISODate(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function todayISO() {
	return formatISODate(startOfToday());
}

export function getDueDayDistance(task) {
	const dueDate = parseDateValue(task?.exp_end_date);
	if (!dueDate) return null;
	dueDate.setHours(0, 0, 0, 0);
	return Math.round((dueDate - startOfToday()) / 86_400_000);
}

export function isOverdue(task) {
	const diff = getDueDayDistance(task);
	return (
		diff !== null &&
		diff < 0 &&
		!["Completed", "Cancelled"].includes(task.status)
	);
}

export function isDueToday(task) {
	const diff = getDueDayDistance(task);
	return diff === 0 && !["Completed", "Cancelled"].includes(task.status);
}

export function isDueSoon(task, days = 2) {
	const diff = getDueDayDistance(task);
	return (
		diff !== null &&
		diff > 0 &&
		diff <= days &&
		!["Completed", "Cancelled"].includes(task.status)
	);
}

export function fmtDate(d) {
	const parsed = parseDateValue(d);
	if (!parsed) return "";
	return parsed.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function fmtDateTime(d) {
	const parsed = parseDateValue(d);
	if (!parsed) return "";
	return parsed.toLocaleString("es-MX", {
		day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
	});
}

export const STATUS_COLOR = {
	"Open":           "#2563eb",
	"Working":        "#7c3aed",
	"Pending Review": "#d97706",
	"Overdue":        "#dc2626",
	"Completed":      "#16a34a",
	"Cancelled":      "#6b7280",
	"Template":       "#6b7280",
};

export const PRIORITY_COLOR = {
	"Urgent": "#dc2626",
	"High":   "#d97706",
	"Medium": "#2563eb",
	"Low":    "#6b7280",
};

export const STATUS_LABEL = {
	"Open":           "Abierta",
	"Working":        "En progreso",
	"Pending Review": "En revisión",
	"Overdue":        "Vencida",
	"Completed":      "Completada",
	"Cancelled":      "Cancelada",
};

export const PRIORITY_LABEL = {
	"Urgent": "Urgente",
	"High":   "Alta",
	"Medium": "Media",
	"Low":    "Baja",
};
