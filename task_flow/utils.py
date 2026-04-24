import frappe


def has_app_permission():
	return frappe.session.user != "Guest"
