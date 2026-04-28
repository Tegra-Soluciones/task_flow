import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Icons from "unplugin-icons/vite";
import path from "path";

export default defineConfig({
	plugins: [
		vue(),
		Icons({ compiler: "vue3", autoInstall: true }),
	],

	// Chunks must be served from the Frappe assets path, not the page URL
	base: "/assets/task_flow/task_flow/",

	build: {
		// Output lands in task_flow/public/task_flow/ → served at /assets/task_flow/task_flow/
		outDir: path.resolve(__dirname, "../task_flow/public/task_flow"),
		emptyOutDir: true,
		target: "es2015",
		rollupOptions: {
			output: {
				entryFileNames: "main.js",
				chunkFileNames: "[name]-[hash].js",
				// index.css is referenced by name in task_flow.html — keep stable.
				// All other CSS chunks get a content hash for browser cache-busting.
				assetFileNames: (info) =>
					info.name === "index.css" ? "index.css" : "[name]-[hash].[ext]",
			},
		},
	},

	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
			// frappe-gantt doesn't export its CSS in package.json exports map
			"frappe-gantt/dist/frappe-gantt.css": path.resolve(
				__dirname,
				"node_modules/frappe-gantt/dist/frappe-gantt.css"
			),
		},
	},

	server: {
		port: 8080,
		// Forward API/asset calls to the running Frappe bench (port 8001)
		proxy: {
			"^/(api|assets|files|private|app)": {
				target: "http://127.0.0.1:8001",
				changeOrigin: true,
				ws: true,
			},
		},
	},

	optimizeDeps: {
		// frappe-ui transitively uses @popperjs/core
		include: ["frappe-ui > @popperjs/core"],
	},
});
