<template>
  <div class="app-shell">
    <AppNavbar />
    <div class="app-body">
      <AppSidebar />
      <button
        v-if="showMobileSidebar"
        class="mobile-sidebar-backdrop"
        type="button"
        aria-label="Cerrar menú"
        @click="closeMobileSidebar"
      />
      <main class="app-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterView, useRoute } from "vue-router";
import AppNavbar from "../components/AppNavbar.vue";
import AppSidebar from "../components/AppSidebar.vue";
import { useAppStore } from "../stores/app.js";

const MOBILE_BREAKPOINT = 980;

const appStore = useAppStore();
const route = useRoute();
const isMobile = ref(false);

function syncViewport(force = false) {
  const nextIsMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  if (force || nextIsMobile !== isMobile.value) {
    isMobile.value = nextIsMobile;
    if (nextIsMobile) appStore.sidebarCollapsed = true;
  }
}

function handleResize() {
  syncViewport(false);
}

function closeMobileSidebar() {
  if (isMobile.value) appStore.sidebarCollapsed = true;
}

const showMobileSidebar = computed(() => isMobile.value && !appStore.sidebarCollapsed);

onMounted(() => {
  syncViewport(true);
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
});

watch(() => route.fullPath, () => {
  if (isMobile.value) appStore.sidebarCollapsed = true;
});
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--tf-bg);
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: calc(100% - var(--tf-navbar-h));
  position: relative;
}

.app-content {
  flex: 1;
  min-height: 0;           /* allow shrinking so children can constrain height */
  overflow-y: auto;
  padding: 24px;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.mobile-sidebar-backdrop {
  display: none;
}

@media (max-width: 980px) {
  .app-content {
    padding: 18px 16px 24px;
  }

  .mobile-sidebar-backdrop {
    display: block;
    position: fixed;
    inset: var(--tf-navbar-h) 0 0 0;
    border: none;
    background: rgba(15, 23, 42, 0.36);
    z-index: 55;
  }
}

@media (max-width: 640px) {
  .app-content {
    padding: 14px 12px 20px;
  }
}
</style>
