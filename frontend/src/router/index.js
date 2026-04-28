import { createRouter, createWebHistory } from "vue-router";
import { useUserStore } from "../stores/user";
import AppLayout from "../layouts/AppLayout.vue";

const routes = [
	{
		path: "/",
		component: AppLayout,
		children: [
			{ path: "", redirect: "/dashboard" },
			{
				path: "dashboard",
				name: "Dashboard",
				component: () => import("../pages/Dashboard.vue"),
				meta: { title: "Tablero" },
			},
			{
				path: "my-tasks",
				name: "MyTasks",
				component: () => import("../pages/MyTasks.vue"),
				meta: { title: "Mis Tareas" },
			},
			{
				path: "tasks",
				name: "TaskList",
				component: () => import("../pages/TaskList.vue"),
				meta: { title: "Todas las Tareas" },
			},
			{
				path: "tasks/:name",
				name: "TaskDetail",
				component: () => import("../pages/TaskDetail.vue"),
				meta: { title: "Tarea" },
			},
			{
				path: "kanban",
				name: "Kanban",
				component: () => import("../pages/KanbanView.vue"),
				meta: { title: "Kanban" },
			},
			{
				path: "gantt",
				name: "Gantt",
				component: () => import("../pages/GanttView.vue"),
				meta: { title: "Gantt" },
			},
			{
				path: "calendar",
				name: "Calendar",
				component: () => import("../pages/CalendarView.vue"),
				meta: { title: "Calendario" },
			},
			{
				path: "projects",
				name: "Projects",
				component: () => import("../pages/Projects.vue"),
				meta: { title: "Proyectos" },
			},
			{
				path: "projects/:name",
				name: "ProjectDetail",
				component: () => import("../pages/ProjectDetail.vue"),
				meta: { title: "Proyecto" },
			},
			{
				path: "settings",
				name: "Settings",
				component: () => import("../pages/Settings.vue"),
				meta: { title: "Configuración" },
			},
		],
	},
];

const router = createRouter({
	history: createWebHistory("/task_flow"),
	routes,
});

// ── Navigation guard: verify active Frappe session ────────────────────────
router.beforeEach(async (to, _from, next) => {
	const userStore = useUserStore();

	if (!userStore.isLoaded) {
		await userStore.fetchCurrentUser();
	}

	if (!userStore.isLoggedIn) {
		const redirect = encodeURIComponent(window.location.pathname + window.location.search);
		window.location.href = `/login?redirect-to=${redirect}`;
		return;
	}

	if (to.meta?.title) {
		document.title = `${to.meta.title} · Task Flow`;
	}

	next();
});

export default router;
