<template>
  <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
    <!-- TAREAS section -->
    <nav class="sidebar-nav">
      <SidebarSection label="TAREAS" :collapsed="appStore.sidebarCollapsed">
        <SidebarItem
          v-for="item in taskItems"
          :key="item.name"
          v-bind="item"
          :collapsed="appStore.sidebarCollapsed"
        />
      </SidebarSection>

      <div class="sidebar-sep" />

      <!-- PROYECTOS section -->
      <SidebarSection label="PROYECTOS" :collapsed="appStore.sidebarCollapsed">
        <SidebarItem
          v-for="item in projectItems"
          :key="item.name"
          v-bind="item"
          :collapsed="appStore.sidebarCollapsed"
        />
      </SidebarSection>

      <div class="sidebar-sep" />

      <!-- CONFIGURACIÓN -->
      <SidebarSection label="" :collapsed="appStore.sidebarCollapsed">
        <SidebarItem
          v-for="item in bottomItems"
          :key="item.name"
          v-bind="item"
          :collapsed="appStore.sidebarCollapsed"
        />
      </SidebarSection>
    </nav>
  </aside>
</template>

<script setup>
import { h } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { useAppStore } from "../stores/app.js";
import {
  HomeIcon, LayoutDashboardIcon, CheckSquareIcon, ListIcon,
  ColumnsIcon, BarChart2Icon, CalendarIcon,
  FolderOpenIcon, SettingsIcon,
} from "lucide-vue-next";

// ── Child: section wrapper ───────────────────────────────────────────────
const SidebarSection = {
  props: { label: String, collapsed: Boolean },
  setup(props, { slots }) {
    return () => h("div", { class: "sidebar-section" }, [
      props.label && !props.collapsed
        ? h("div", { class: "section-label" }, props.label)
        : null,
      slots.default?.(),
    ]);
  },
};

// ── Child: nav item ──────────────────────────────────────────────────────
const SidebarItem = {
  props: {
    name: String,
    label: String,
    to: String,
    icon: Object,
    collapsed: Boolean,
  },
  setup(props) {
    const route = useRoute();
    return () => {
      const isActive = route.name === props.name;
      return h(RouterLink, {
        to: props.to,
        class: ["sidebar-item", isActive && "active"],
        title: props.collapsed ? props.label : undefined,
      }, () => [
        h(props.icon, { size: 16, class: "item-icon" }),
        !props.collapsed ? h("span", { class: "item-label" }, props.label) : null,
      ]);
    };
  },
};

const appStore = useAppStore();

const taskItems = [
  { name: "Home",       label: "Inicio",             to: "/home",      icon: HomeIcon },
  { name: "Dashboard",  label: "Tablero",            to: "/dashboard", icon: LayoutDashboardIcon },
  { name: "MyTasks",    label: "Mis Tareas",         to: "/my-tasks",  icon: CheckSquareIcon },
  { name: "TaskList",   label: "Todas las Tareas",   to: "/tasks",     icon: ListIcon },
  { name: "Kanban",     label: "Kanban",             to: "/kanban",    icon: ColumnsIcon },
  { name: "Gantt",      label: "Gantt",              to: "/gantt",     icon: BarChart2Icon },
  { name: "Calendar",   label: "Calendario",         to: "/calendar",  icon: CalendarIcon },
];

const projectItems = [
  { name: "Projects",   label: "Proyectos",          to: "/projects",  icon: FolderOpenIcon },
];

const bottomItems = [
  { name: "Settings",   label: "Configuración",      to: "/settings",  icon: SettingsIcon },
];
</script>

<style scoped>
.sidebar {
  width: var(--tf-sidebar-w);
  background: var(--tf-surface);
  border-right: 1px solid var(--tf-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
  transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar.collapsed {
  width: var(--tf-sidebar-w-collapsed);
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-sep {
  height: 1px;
  background: var(--tf-border);
  margin: 6px 4px;
}

/* Section label */
:deep(.section-label) {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .06em;
  color: var(--tf-text-faint);
  padding: 10px 10px 4px;
  text-transform: uppercase;
}

/* Nav items */
:deep(.sidebar-item) {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--tf-text-muted);
  text-decoration: none;
  transition: background 100ms, color 100ms;
  white-space: nowrap;
  overflow: hidden;
}

:deep(.sidebar-item:hover) {
  background: var(--tf-hover-bg);
  color: var(--tf-text);
}

:deep(.sidebar-item.active) {
  background: var(--tf-active-bg);
  color: var(--tf-active-text);
}

:deep(.sidebar-item.active .item-icon) {
  color: var(--tf-active-text);
}

:deep(.item-icon) { flex-shrink: 0; }

:deep(.item-label) {
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 980px) {
  .sidebar,
  .sidebar.collapsed {
    width: min(84vw, 320px);
  }

  .sidebar {
    position: fixed;
    top: var(--tf-navbar-h);
    left: 0;
    bottom: 0;
    z-index: 60;
    height: calc(100dvh - var(--tf-navbar-h));
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
    transform: translateX(0);
    transition: transform 200ms ease;
  }

  .sidebar.collapsed {
    transform: translateX(-105%);
  }
}

</style>
