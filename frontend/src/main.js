import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import { setConfig, frappeRequest } from "frappe-ui";
import App from "./App.vue";

import "./index.css";

// Point frappe-ui at the Frappe REST API
setConfig("resourceFetcher", frappeRequest);

const router = createRouter({
	history: createWebHistory("/task_flow"),
	routes: [
		{
			path: "/",
			component: () => import("./pages/Home.vue"),
		},
	],
});

const pinia = createPinia();
const app = createApp(App);

app.use(router);
app.use(pinia);
app.mount("#app");
