import frappe
import json
from frappe.sessions import get_csrf_token

no_cache = 1


def get_context(context):
	if frappe.session.user == "Guest":
		frappe.local.flags.redirect_location = "/login?redirect-to=/task_flow"
		raise frappe.Redirect

	context.no_header = 1
	context.no_breadcrumbs = 1
	context.site_name = frappe.local.site
	context.csrf_token = get_csrf_token()

	user_doc = frappe.db.get_value(
		"User",
		frappe.session.user,
		["name", "full_name", "user_image"],
		as_dict=True,
	) or {}

	context.boot_user_json = json.dumps({
		"name": user_doc.get("name") or frappe.session.user,
		"full_name": user_doc.get("full_name") or frappe.session.user,
		"user_image": user_doc.get("user_image") or "",
	})
