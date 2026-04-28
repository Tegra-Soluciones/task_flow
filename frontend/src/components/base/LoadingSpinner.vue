<template>
  <div class="spinner-wrap" :class="{ 'full-page': fullPage }">
    <svg
      class="spinner"
      :width="size"
      :height="size"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" stroke="var(--tf-border)" stroke-width="3" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="var(--tf-primary)"
        stroke-width="3"
        stroke-linecap="round"
      />
    </svg>
    <span v-if="label" class="spinner-label">{{ label }}</span>
  </div>
</template>

<script setup>
defineProps({
  size:     { type: Number, default: 32 },
  label:    { type: String, default: "" },
  fullPage: { type: Boolean, default: false },
});
</script>

<style scoped>
.spinner-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.spinner-wrap.full-page {
  position: absolute;
  inset: 0;
  background: var(--tf-bg);
  z-index: 200;
}

.spinner {
  animation: spin 0.75s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.spinner-label {
  font-size: 13px;
  color: var(--tf-text-muted);
}
</style>
