"""Scheduled tasks and document-event hooks for Task Flow."""

import frappe
from frappe.utils import today


def send_due_date_reminders():
	"""Daily: notify watchers of tasks due today that haven't been reminded yet."""
	tasks = frappe.get_all(
		"Task",
		filters={
			"status": ["in", ["Open", "Working"]],
			"exp_end_date": today(),
			"reminder_sent": 0,
		},
		fields=["name", "subject", "watchers"],
	)
	for task in tasks:
		_notify_watchers(task)
		frappe.db.set_value("Task", task.name, "reminder_sent", 1)


def reset_reminder_flag_on_date_change(doc, method=None):
	"""Reset reminder_sent when the due date is pushed to a future date."""
	if doc.has_value_changed("exp_end_date") and doc.reminder_sent:
		doc.reminder_sent = 0


def _notify_watchers(task):
	watchers = frappe.get_all(
		"Task Watcher",
		filters={"parent": task.name, "parenttype": "Task"},
		fields=["user"],
	)
	for watcher in watchers:
		frappe.sendmail(
			recipients=[watcher.user],
			subject=f"[Task Flow] Tarea vence hoy: {task.subject}",
			message=f'La tarea <b>{task.subject}</b> vence hoy. '
			        f'<a href="/task_flow">Ver en Task Flow</a>',
			now=True,
		)
