import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { todayISO } from "../api/index.js";

export const useFiltersStore = defineStore("filters", () => {
	const text     = ref("");
	const project  = ref("");
	const assignee = ref("");
	const priority = ref("");
	const dateFrom = ref("");
	const dateTo   = ref("");
	const onlyOverdue = ref(false);

	// Build Frappe filter array from active values
	const frappeFilters = computed(() => {
		const f = [["status", "not in", ["Template", "Cancelled"]]];
		if (text.value)     f.push(["subject", "like", `%${text.value}%`]);
		if (project.value)  f.push(["project", "=", project.value]);
		if (assignee.value) f.push(["_assign", "like", `%${assignee.value}%`]);
		if (priority.value) f.push(["priority", "=", priority.value]);
		if (dateFrom.value) f.push(["exp_end_date", ">=", dateFrom.value]);
		if (dateTo.value)   f.push(["exp_end_date", "<=", dateTo.value]);
		if (onlyOverdue.value) {
			f.push(["exp_end_date", "<", todayISO()]);
			f.push(["status", "not in", ["Completed", "Cancelled"]]);
		}
		return f;
	});

	const hasActiveFilters = computed(() =>
		!!(text.value || project.value || assignee.value || priority.value ||
		   dateFrom.value || dateTo.value || onlyOverdue.value)
	);

	function reset() {
		text.value = "";
		project.value = "";
		assignee.value = "";
		priority.value = "";
		dateFrom.value = "";
		dateTo.value = "";
		onlyOverdue.value = false;
	}

	return {
		text, project, assignee, priority, dateFrom, dateTo, onlyOverdue,
		frappeFilters, hasActiveFilters, reset,
	};
});
