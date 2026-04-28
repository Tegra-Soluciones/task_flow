<template>
  <header class="navbar">
    <!-- Left: toggle + logo + ERPNext menu -->
    <div class="navbar-left">
      <!-- Sidebar toggle -->
      <button class="icon-btn" @click="appStore.toggleSidebar" title="Colapsar menú">
        <MenuIcon v-if="!appStore.sidebarCollapsed" :size="18" />
        <MenuIcon v-else :size="18" />
      </button>

      <!-- Logo + app name -->
      <RouterLink to="/dashboard" class="brand">
        <img :src="LOGO_URL" alt="Task Flow" class="brand-logo" />
        <span v-if="!appStore.sidebarCollapsed" class="brand-name">Task Flow</span>
      </RouterLink>

      <!-- Back to ERPNext -->
      <div class="dropdown-wrap" ref="erpMenuRef">
        <button class="nav-pill" @click="erpMenuOpen = !erpMenuOpen">
          <GridIcon :size="14" />
          <span>ERPNext</span>
          <ChevronDownIcon :size="13" />
        </button>
        <Transition name="dropdown">
          <div v-if="erpMenuOpen" class="dropdown-menu" @click="erpMenuOpen = false">
            <a href="/app" class="dropdown-item">
              <LayoutDashboardIcon :size="15" />
              <span>Escritorio</span>
            </a>
            <a href="/app/task" class="dropdown-item">
              <CheckSquareIcon :size="15" />
              <span>Tareas (ERPNext)</span>
            </a>
            <a href="/app/project" class="dropdown-item">
              <FolderOpenIcon :size="15" />
              <span>Proyectos (ERPNext)</span>
            </a>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Right: dark mode toggle + user menu -->
    <div class="navbar-right">
      <!-- Dark mode -->
      <button class="icon-btn" @click="appStore.toggleDark" :title="appStore.isDark ? 'Modo claro' : 'Modo oscuro'">
        <SunIcon v-if="appStore.isDark" :size="16" />
        <MoonIcon v-else :size="16" />
      </button>

      <!-- User menu -->
      <div class="dropdown-wrap" ref="userMenuRef">
        <button class="user-trigger" @click="userMenuOpen = !userMenuOpen">
          <UserAvatar :name="userStore.displayName" :src="userStore.avatar" :size="28" />
          <span class="user-name">{{ userStore.displayName }}</span>
          <ChevronDownIcon :size="13" />
        </button>
        <Transition name="dropdown">
          <div v-if="userMenuOpen" class="dropdown-menu dropdown-menu-right" @click="userMenuOpen = false">
            <div class="dropdown-header">
              <UserAvatar :name="userStore.displayName" :src="userStore.avatar" :size="36" />
              <div>
                <div class="user-full-name">{{ userStore.displayName }}</div>
                <div class="user-email">{{ userStore.email }}</div>
              </div>
            </div>
            <div class="dropdown-divider" />
            <a :href="`/app/user/${userStore.email}`" class="dropdown-item">
              <UserIcon :size="15" />
              <span>Mi Perfil</span>
            </a>
            <RouterLink to="/my-tasks" class="dropdown-item">
              <CheckSquareIcon :size="15" />
              <span>Mis Tareas</span>
            </RouterLink>
            <div class="dropdown-divider" />
            <button class="dropdown-item danger" @click="logout">
              <LogOutIcon :size="15" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from "vue";
import { RouterLink } from "vue-router";
import {
  MenuIcon, GridIcon, ChevronDownIcon, LayoutDashboardIcon,
  CheckSquareIcon, FolderOpenIcon, SunIcon, MoonIcon,
  UserIcon, LogOutIcon,
} from "lucide-vue-next";
import { useAppStore } from "../stores/app.js";
import { useUserStore } from "../stores/user.js";
import UserAvatar from "./base/UserAvatar.vue";
import { onClickOutside } from "@vueuse/core";

const LOGO_URL = "/assets/task_flow/images/logo.svg";

const appStore = useAppStore();
const userStore = useUserStore();

const erpMenuOpen = ref(false);
const userMenuOpen = ref(false);
const erpMenuRef = ref(null);
const userMenuRef = ref(null);

onClickOutside(erpMenuRef, () => (erpMenuOpen.value = false));
onClickOutside(userMenuRef, () => (userMenuOpen.value = false));

async function logout() {
  await fetch("/api/method/logout", { method: "POST" });
  window.location.href = "/login";
}
</script>

<style scoped>
.navbar {
  height: var(--tf-navbar-h);
  background: var(--tf-surface);
  border-bottom: 1px solid var(--tf-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  gap: 8px;
  flex-shrink: 0;
  box-shadow: var(--tf-shadow);
  z-index: 50;
}

.navbar-left, .navbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Icon button */
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--tf-text-muted);
  transition: background 120ms, color 120ms;
}
.icon-btn:hover {
  background: var(--tf-hover-bg);
  color: var(--tf-text);
}

/* Brand */
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--tf-text);
  padding: 4px 6px;
  border-radius: 6px;
  transition: background 120ms;
}
.brand:hover { background: var(--tf-hover-bg); }
.brand-logo { width: 22px; height: 22px; }
.brand-name { font-weight: 600; font-size: 14px; white-space: nowrap; }

/* Nav pill (ERPNext button) */
.nav-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: 1px solid var(--tf-border);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: var(--tf-text-muted);
  transition: background 120ms, color 120ms;
}
.nav-pill:hover { background: var(--tf-hover-bg); color: var(--tf-text); }

/* User trigger */
.user-trigger {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--tf-text);
  transition: background 120ms;
}
.user-trigger:hover { background: var(--tf-hover-bg); }
.user-name {
  font-size: 13px;
  font-weight: 500;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Dropdown */
.dropdown-wrap { position: relative; }

.dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 200px;
  background: var(--tf-surface);
  border: 1px solid var(--tf-border);
  border-radius: 8px;
  box-shadow: var(--tf-shadow);
  padding: 4px;
  z-index: 100;
}
.dropdown-menu-right { left: auto; right: 0; }

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
}
.user-full-name { font-weight: 600; font-size: 13px; color: var(--tf-text); }
.user-email { font-size: 11px; color: var(--tf-text-muted); }

.dropdown-divider {
  height: 1px;
  background: var(--tf-border);
  margin: 4px 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--tf-text);
  text-decoration: none;
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  transition: background 100ms;
}
.dropdown-item:hover { background: var(--tf-hover-bg); }
.dropdown-item.danger { color: #dc2626; }
.dropdown-item.danger:hover { background: #fef2f2; }
.dark .dropdown-item.danger:hover { background: #3f1212; }

/* Dropdown transition */
.dropdown-enter-active,
.dropdown-leave-active { transition: opacity 120ms, transform 120ms; }
.dropdown-enter-from,
.dropdown-leave-to { opacity: 0; transform: translateY(-4px); }

@media (max-width: 980px) {
  .navbar {
    padding: 0 10px;
  }

  .brand-name,
  .user-name {
    display: none;
  }

  .nav-pill {
    padding-inline: 8px;
  }
}

@media (max-width: 700px) {
  .navbar-left,
  .navbar-right {
    gap: 4px;
  }

  .nav-pill span {
    display: none;
  }

  .nav-pill {
    gap: 0;
    width: 32px;
    height: 32px;
    justify-content: center;
    padding: 0;
  }

  .dropdown-menu {
    min-width: min(220px, calc(100vw - 24px));
  }

  .user-email {
    word-break: break-word;
  }
}
</style>
