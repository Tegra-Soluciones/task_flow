import { defineStore } from "pinia";
import { ref, watch } from "vue";

const STORAGE_KEY = "tf_sidebar_collapsed";

export const useAppStore = defineStore("app", () => {
	const sidebarCollapsed = ref(
		localStorage.getItem(STORAGE_KEY) === "true"
	);

	watch(sidebarCollapsed, (val) => {
		localStorage.setItem(STORAGE_KEY, String(val));
		// sync with <html> so CSS variables respond
		document.documentElement.classList.toggle("sidebar-collapsed", val);
	}, { immediate: true });

	function toggleSidebar() {
		sidebarCollapsed.value = !sidebarCollapsed.value;
	}

	// Dark mode — reads system preference + persists choice
	const THEME_KEY = "tf_theme";
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
	const isDark = ref(
		localStorage.getItem(THEME_KEY)
			? localStorage.getItem(THEME_KEY) === "dark"
			: prefersDark.matches
	);

	watch(isDark, (val) => {
		document.documentElement.classList.toggle("dark", val);
		localStorage.setItem(THEME_KEY, val ? "dark" : "light");
	}, { immediate: true });

	// Follow OS changes when no explicit preference saved
	prefersDark.addEventListener("change", (e) => {
		if (!localStorage.getItem(THEME_KEY)) isDark.value = e.matches;
	});

	function toggleDark() {
		isDark.value = !isDark.value;
	}

	return { sidebarCollapsed, toggleSidebar, isDark, toggleDark };
});
