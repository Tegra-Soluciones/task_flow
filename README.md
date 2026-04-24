# Task Flow

Gestión de tareas y proyectos para ERPNext v15.

SPA construida con Vue 3 + Vite + frappe-ui, servida desde `www/task_flow`.
Extiende los DocTypes nativos `Task` y `Project` con custom fields empaquetados
como fixtures que se instalan automáticamente con `bench migrate`.

## Instalación

```bash
cd ~/frappe-bench
bench get-app /path/to/task_flow   # o git URL
bench --site site1.local install-app task_flow
bench --site site1.local migrate
```

## Desarrollo frontend

```bash
cd apps/task_flow/frontend
npm install
npm run dev        # proxy → http://127.0.0.1:8000
```

## Build de producción

```bash
cd apps/task_flow/frontend
npm run build      # output → task_flow/public/task_flow/
bench build --app task_flow
```

## Custom fields añadidos

| DocType  | Campo           | Tipo             | Propósito                          |
|----------|-----------------|------------------|------------------------------------|
| Task     | cover_image     | Attach Image     | Imagen de portada en tarjetas      |
| Task     | reminder_sent   | Check (hidden)   | Flag anti-duplicado de recordatorio|
| Task     | watchers        | Table MultiSelect| Observadores de la tarea           |
| Project  | cover_image     | Attach Image     | Imagen de portada en tarjetas      |

Campos nativos reutilizados (no duplicados):
- `Task.color`, `Task.priority`, `Task.status`, `Task.exp_end_date`
- `Task.depends_on` (child table), `Project.users` (child table)
- `User.user_image`, `User.phone`, `User.mobile_no`
- Tags libres via el sistema `_user_tags` nativo de Frappe
