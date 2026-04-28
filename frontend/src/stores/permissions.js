import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { getUserPermissions } from "../api/index.js";

export const usePermissionsStore = defineStore("permissions", () => {
	const perms  = ref(null);
	const loaded = ref(false);

	async function load() {
		if (loaded.value) return;
		try {
			perms.value = await getUserPermissions();
		} catch {
			// Fallback: assume minimal permissions so UI doesn't break
			perms.value = {
				can_create_project: false,
				can_write_project:  false,
				can_delete_project: false,
				can_create_task:    true,
				can_write_task:     true,
				can_delete_task:    false,
				is_manager:         false,
				roles:              [],
			};
		} finally {
			loaded.value = true;
		}
	}

	const canCreateProject = computed(() => perms.value?.can_create_project ?? false);
	const canWriteProject  = computed(() => perms.value?.can_write_project  ?? false);
	const canDeleteProject = computed(() => perms.value?.can_delete_project ?? false);
	const canCreateTask    = computed(() => perms.value?.can_create_task    ?? true);
	const canWriteTask     = computed(() => perms.value?.can_write_task     ?? true);
	const canDeleteTask    = computed(() => perms.value?.can_delete_task    ?? false);
	const isManager        = computed(() => perms.value?.is_manager         ?? false);

	// Whether the current user can edit a specific task
	// (managers can edit anything; others can only edit tasks they're assigned to)
	function canEditTask(task, currentUserEmail) {
		if (!perms.value?.can_write_task) return false;
		if (isManager.value) return true;
		return (task._assignees || []).includes(currentUserEmail);
	}

	return {
		perms, loaded, load,
		canCreateProject, canWriteProject, canDeleteProject,
		canCreateTask, canWriteTask, canDeleteTask,
		isManager, canEditTask,
	};
});
