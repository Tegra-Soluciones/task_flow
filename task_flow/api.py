import frappe
import json
from frappe import _
from frappe.desk.form import assign_to as frappe_assign_to


# ── User info ──────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_user_info(email):
	"""Return basic user info — uses db.get_value to bypass DocType permissions."""
	if not email:
		return None
	user = frappe.db.get_value(
		"User", email,
		["name", "full_name", "user_image", "mobile_no", "phone"],
		as_dict=True,
	)
	return user or {
		"name": email, "full_name": email,
		"user_image": None, "mobile_no": None, "phone": None,
	}


# ── Task assignments (via ToDo) ────────────────────────────────────────────────

@frappe.whitelist()
def add_task_assignment(task_name, email):
	"""
	Assign a user to a Task using Frappe's standard assignment flow.
	This creates a ToDo with allocated_to and lets Frappe keep _assign in sync.
	"""
	task = frappe.get_doc("Task", task_name)
	task.check_permission("write")

	if not frappe.db.exists("User", email):
		frappe.throw(_("El usuario {0} no existe").format(email))

	frappe_assign_to.add({
		"doctype": "Task",
		"name": task_name,
		"assign_to": [email],
		"description": task.subject or task_name,
		"priority": "Medium",
		"date": frappe.utils.nowdate(),
		"assigned_by": frappe.session.user,
	})

	return {"status": "ok", "_assign": _task_assign(task_name)}


@frappe.whitelist()
def remove_task_assignment(task_name, email):
	"""Cancel an assignment using Frappe's standard ToDo assignment flow."""
	task = frappe.get_doc("Task", task_name)
	task.check_permission("write")

	frappe_assign_to.remove("Task", task_name, email)
	return {"status": "ok", "_assign": _task_assign(task_name)}


@frappe.whitelist()
def get_doc_assignments(doctype, name):
	"""Return active assignee emails for a document."""
	doc = frappe.get_doc(doctype, name)
	doc.check_permission("read")

	return frappe.get_all(
		"ToDo",
		filters={
			"reference_type": doctype,
			"reference_name": name,
			"status": ("not in", ["Cancelled", "Closed"]),
		},
		pluck="allocated_to",
	)


def _task_assign(task_name):
	raw = frappe.db.get_value("Task", task_name, "_assign") or "[]"
	try:
		return json.loads(raw)
	except Exception:
		return []


# ── Email ──────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def send_task_email(task_name, to_email, subject, message):
	"""
	Send a reminder email for a Task using ERPNext's email queue.
	Logs to task activity and sets reminder_sent = 1.
	"""
	frappe.has_permission("Task", "read", task_name, throw=True)

	frappe.sendmail(
		recipients=[to_email],
		subject=subject,
		message=message,
		reference_doctype="Task",
		reference_name=task_name,
		now=True,
	)

	# Activity log
	frappe.get_doc({
		"doctype": "Comment",
		"comment_type": "Info",
		"reference_doctype": "Task",
		"reference_name": task_name,
		"content": _("Recordatorio enviado por correo a <b>{0}</b>").format(to_email),
		"owner": frappe.session.user,
	}).insert(ignore_permissions=True)

	frappe.db.set_value("Task", task_name, "reminder_sent", 1, update_modified=False)
	frappe.db.commit()
	return {"status": "ok"}


# ── Permissions ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_user_permissions():
	"""Return current user's Task Flow relevant permissions."""
	roles = frappe.get_roles()
	return {
		"user":               frappe.session.user,
		"roles":              roles,
		"can_create_project": frappe.has_permission("Project", "create"),
		"can_write_project":  frappe.has_permission("Project", "write"),
		"can_delete_project": frappe.has_permission("Project", "delete"),
		"can_create_task":    frappe.has_permission("Task", "create"),
		"can_write_task":     frappe.has_permission("Task", "write"),
		"can_delete_task":    frappe.has_permission("Task", "delete"),
		"is_manager":         "System Manager" in roles or "Projects Manager" in roles,
	}


# ── Project stats ──────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_project_stats(project_name):
	"""Return aggregated task statistics for a project."""
	frappe.has_permission("Project", "read", project_name, throw=True)

	tasks = frappe.get_all(
		"Task",
		{"project": project_name, "status": ["not in", ["Cancelled", "Template"]]},
		["name", "status", "progress", "exp_end_date", "priority"],
	)

	total     = len(tasks)
	completed = sum(1 for t in tasks if t.status == "Completed")
	overdue   = sum(
		1 for t in tasks
		if t.exp_end_date
		and str(t.exp_end_date) < frappe.utils.nowdate()
		and t.status not in ["Completed", "Cancelled"]
	)
	progress = round(sum(t.progress or 0 for t in tasks) / total) if total else 0

	by_status   = {}
	by_priority = {}
	for t in tasks:
		by_status[t.status]     = by_status.get(t.status, 0) + 1
		by_priority[t.priority] = by_priority.get(t.priority, 0) + 1

	return {
		"total":       total,
		"completed":   completed,
		"open":        total - completed,
		"overdue":     overdue,
		"progress":    progress,
		"by_status":   by_status,
		"by_priority": by_priority,
	}
