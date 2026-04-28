import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { frappeRequest } from "frappe-ui";

export const useUserStore = defineStore("user", () => {
	const user = ref(null);
	const isLoaded = ref(false);

	const isLoggedIn = computed(() => {
		return !!user.value && user.value.name !== "Guest";
	});

	const displayName = computed(() => user.value?.full_name || user.value?.name || "");
	const avatar = computed(() => user.value?.user_image || null);
	const email = computed(() => user.value?.name || "");

	async function fetchCurrentUser() {
		// Use boot data injected by www/task_flow.py to avoid a round-trip on startup
		if (window.tf_boot_user?.name) {
			user.value = window.tf_boot_user;
			isLoaded.value = true;
			return;
		}
		try {
			const email = await frappeRequest({
				url: "/api/method/frappe.auth.get_logged_user",
				method: "GET",
			});
			if (!email || email === "Guest") {
				user.value = null;
			} else {
				user.value = { name: email, full_name: email, user_image: "" };
			}
		} catch {
			user.value = null;
		} finally {
			isLoaded.value = true;
		}
	}

	return { user, isLoaded, isLoggedIn, displayName, avatar, email, fetchCurrentUser };
});
