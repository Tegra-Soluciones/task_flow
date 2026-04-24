import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
	plugins: [vue()],

	build: {
		// Output lands in task_flow/public/task_flow/ → served at /assets/task_flow/task_flow/
		outDir: path.resolve(__dirname, "../task_flow/public/task_flow"),
		emptyOutDir: true,
		target: "es2015",
		rollupOptions: {
			output: {
				// Stable filenames so www/task_flow.html can reference them without hashes
				entryFileNames: "main.js",
				chunkFileNames: "[name]-[hash].js",
				assetFileNames: "[name].[ext]",
			},
		},
	},

	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},

	server: {
		port: 8080,
		// Forward API/asset calls to the running Frappe bench
		proxy: {
			"^/(api|assets|files|private|app)": {
				target: "http://127.0.0.1:8000",
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
