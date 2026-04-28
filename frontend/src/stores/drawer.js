import { defineStore } from "pinia";
import { ref } from "vue";

export const useDrawerStore = defineStore("drawer", () => {
	const isOpen   = ref(false);
	const taskName = ref(null);

	function open(name) {
		taskName.value = name;
		isOpen.value = true;
	}

	function close() {
		isOpen.value = false;
		taskName.value = null;
	}

	return { isOpen, taskName, open, close };
});
