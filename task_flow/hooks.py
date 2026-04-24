app_name = "task_flow"
app_title = "Task Flow"
app_publisher = "Yelke"
app_description = "Gestión de tareas y proyectos — SPA sobre ERPNext v15"
app_email = "dev@yelke.com"
app_license = "mit"
app_version = "0.1.0"

required_apps = ["frappe", "erpnext"]

# ── Desk / Apps screen icon ────────────────────────────────────────────────────
add_to_apps_screen = [
	{
		"name": "task_flow",
		"logo": "/assets/task_flow/images/logo.svg",
		"title": "Task Flow",
		"route": "/task_flow",
		"has_permission": "task_flow.utils.has_app_permission",
	}
]

# ── SPA sub-route catch-all ────────────────────────────────────────────────────
# Redirects /task_flow/<any-sub-path> → /task_flow so Vue Router handles routing.
website_route_rules = [
	{"from_route": "/task_flow/<path:app_path>", "to_route": "task_flow"},
]

# ── Fixtures ───────────────────────────────────────────────────────────────────
# Custom Fields are applied to existing DocTypes (Task, Project).
# Task Watcher child DocType is part of this app's module and is handled by migrate.
fixtures = [
	{
		"dt": "Custom Field",
		"filters": [["module", "=", "Task Flow"]],
	},
]

# ── Scheduled tasks ────────────────────────────────────────────────────────────
scheduler_events = {
	"daily": [
		"task_flow.tasks.send_due_date_reminders",
	],
}

# ── Doc events ────────────────────────────────────────────────────────────────
doc_events = {
	"Task": {
		"on_update": "task_flow.tasks.reset_reminder_flag_on_date_change",
	},
}
