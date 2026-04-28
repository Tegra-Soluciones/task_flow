import { defineStore } from "pinia";
import { ref, watch } from "vue";

const KEY = "tf_prefs";

function load() {
	try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
	catch { return {}; }
}

export const usePrefsStore = defineStore("prefs", () => {
	const saved = load();

	const showCompleted  = ref(saved.showCompleted  ?? true);
	const groupByProject = ref(saved.groupByProject ?? false);
	const dueSoonDays    = ref(saved.dueSoonDays    ?? 3);
	const compactCards   = ref(saved.compactCards   ?? false);

	// Persist on any change
	watch([showCompleted, groupByProject, dueSoonDays, compactCards], () => {
		localStorage.setItem(KEY, JSON.stringify({
			showCompleted:  showCompleted.value,
			groupByProject: groupByProject.value,
			dueSoonDays:    dueSoonDays.value,
			compactCards:   compactCards.value,
		}));
	});

	function reset() {
		showCompleted.value  = true;
		groupByProject.value = false;
		dueSoonDays.value    = 3;
		compactCards.value   = false;
	}

	return { showCompleted, groupByProject, dueSoonDays, compactCards, reset };
});
