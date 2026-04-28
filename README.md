# Task Flow

Gestión de tareas y proyectos para ERPNext v15.

SPA construida con Vue 3 + Vite + frappe-ui, servida desde `/task_flow`.
Extiende los DocTypes nativos `Task` y `Project` con custom fields empaquetados
como fixtures que se instalan automáticamente con `bench migrate`.

---

## Rutas de la aplicación

| Ruta                  | Vista           | Descripción                                  |
|-----------------------|-----------------|----------------------------------------------|
| `/task_flow/`         | Dashboard       | Resumen: tareas vencidas, por vencer, estadísticas |
| `/task_flow/my-tasks` | Mis Tareas      | Kanban personal: columnas por estado         |
| `/task_flow/tasks`    | Todas las Tareas| Tabla sorteable con filtros                  |
| `/task_flow/kanban`   | Kanban Global   | Tablero kanban del equipo con drag-and-drop  |
| `/task_flow/gantt`    | Gantt           | Línea de tiempo agrupada por usuario         |
| `/task_flow/calendar` | Calendario      | Vista mensual/semanal de vencimientos        |
| `/task_flow/projects` | Proyectos       | Tarjetas de proyecto con CRUD completo       |
| `/task_flow/projects/:name` | Detalle de Proyecto | Info + Kanban filtrado por proyecto |
| `/task_flow/settings` | Configuración   | Preferencias guardadas en localStorage       |

---

## Funcionalidades principales

- **Tareas**: crear, editar, asignar, comentar, subtareas, progreso, dependencias
- **Asignaciones**: vía el sistema nativo de ToDo de Frappe (persisten en ERPNext)
- **Notificaciones**: recordatorio por WhatsApp (wa.me) y correo electrónico
- **Proyectos**: CRUD completo, estadísticas de avance, Kanban por proyecto
- **Permisos**: respeta roles ERPNext (System Manager / Projects Manager = admin)
- **Preferencias**: tema, tarjetas compactas, días "por vencer", agrupar por proyecto

---

## Custom fields añadidos

| DocType  | Campo           | Tipo             | Propósito                           |
|----------|-----------------|------------------|-------------------------------------|
| Task     | cover_image     | Attach Image     | Imagen de portada en tarjetas       |
| Task     | reminder_sent   | Check (hidden)   | Flag anti-duplicado de recordatorio |
| Task     | watchers        | Table MultiSelect| Observadores de la tarea            |
| Project  | cover_image     | Attach Image     | Imagen de portada en tarjetas       |

Campos nativos reutilizados (no duplicados):
- `Task.color`, `Task.priority`, `Task.status`, `Task.exp_end_date`
- `Task.depends_on` (child table), `Project.users` (child table)
- `User.user_image`, `User.phone`, `User.mobile_no`

---

## Instalación rápida

Consulta [INSTALL.md](INSTALL.md) para instrucciones detalladas.

```bash
cd ~/frappe-bench
bench get-app /ruta/o/url/de/task_flow
bench --site misite.local install-app task_flow
bench --site misite.local migrate
```

---

## Desarrollo frontend

```bash
cd apps/task_flow/frontend
npm install
npm run dev        # dev server con proxy → http://127.0.0.1:8000
```

## Build de producción

```bash
cd apps/task_flow/frontend
npm run build      # output → task_flow/public/task_flow/
bench build --app task_flow
```

---

## Endpoints Python personalizados

Todos en `task_flow/api.py`:

| Endpoint                                  | Descripción                          |
|-------------------------------------------|--------------------------------------|
| `task_flow.api.add_task_assignment`       | Crear asignación vía ToDo            |
| `task_flow.api.remove_task_assignment`    | Cancelar asignación                  |
| `task_flow.api.send_task_email`           | Enviar recordatorio por correo       |
| `task_flow.api.get_user_permissions`      | Permisos del usuario actual          |
| `task_flow.api.get_project_stats`         | Estadísticas de tareas del proyecto  |
| `task_flow.api.get_user_info`             | Datos de usuario (imagen, teléfono)  |
