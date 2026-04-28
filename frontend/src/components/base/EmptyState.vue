<template>
  <div class="empty-state">
    <div class="empty-icon">
      <component :is="icon" v-if="icon" :size="40" />
      <InboxIcon v-else :size="40" />
    </div>
    <h3 class="empty-title">{{ title }}</h3>
    <p v-if="description" class="empty-desc">{{ description }}</p>
    <slot />
  </div>
</template>

<script setup>
import { InboxIcon } from "lucide-vue-next";

defineProps({
  title:       { type: String, default: "Sin resultados" },
  description: { type: String, default: "" },
  icon:        { type: Object, default: null },
});
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--tf-hover-bg);
  color: var(--tf-text-faint);
  margin-bottom: 4px;
}

.empty-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--tf-text);
}

.empty-desc {
  margin: 0;
  font-size: 13px;
  color: var(--tf-text-muted);
  max-width: 320px;
  line-height: 1.5;
}
</style>
