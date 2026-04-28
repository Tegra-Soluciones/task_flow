# Guía de instalación — Task Flow

## Requisitos previos

- ERPNext v15 (Frappe v15) instalado y funcionando
- Node.js 18+ y Python 3.10+
- El sitio Frappe ya existe y está activo

---

## 1. Obtener la app

```bash
cd ~/frappe-bench

# Desde un directorio local
bench get-app /ruta/absoluta/a/task_flow

# O desde un repositorio Git
# bench get-app https://github.com/tu-usuario/task_flow
```

---

## 2. Instalar en el sitio

```bash
bench --site misite.local install-app task_flow
bench --site misite.local migrate
```

`bench migrate` aplica los fixtures que crean los custom fields en Task y Project.

---

## 3. Build del frontend

```bash
cd ~/frappe-bench/apps/task_flow/frontend
npm install
npm run build
```

Los assets compilados quedan en `task_flow/public/task_flow/` y Frappe los sirve automáticamente.

---

## 4. Reiniciar servicios

```bash
bench restart
```

Ahora accede a `https://misite.local/task_flow/` con tu usuario de ERPNext.

---

## 5. Configurar correo electrónico (opcional)

Para que el botón **"Enviar correo"** funcione, ERPNext debe tener un servidor de correo saliente configurado:

1. Ve a **ERPNext → Configuración → Correo electrónico → Cuenta de correo saliente**
2. Configura tu servidor SMTP (Gmail, SendGrid, etc.)
3. Marca la cuenta como **predeterminada**
4. Guarda y prueba con el botón "Enviar correo de prueba"

Si el servidor no está configurado, el botón mostrará un error al intentar enviar.

---

## 6. Configurar WhatsApp (opcional)

El botón de WhatsApp abre `wa.me/<número>` en una nueva pestaña.
Para que el número aparezca, el usuario asignado debe tener su **Teléfono móvil** registrado en ERPNext:

1. Ve a **ERPNext → Configuración → Usuarios → [nombre del usuario]**
2. En la pestaña "Más información", completa el campo **Teléfono móvil**
3. Guarda

El número puede incluir el código de país (`+52`, `+1`, etc.) o solo dígitos — la app lo sanitiza automáticamente.

---

## 7. Permisos de usuario

Task Flow respeta los permisos de ERPNext:

| Rol                           | Permisos                                      |
|-------------------------------|-----------------------------------------------|
| System Manager / Projects Manager | CRUD completo en proyectos y tareas       |
| Cualquier otro usuario        | Crear/editar tareas; solo leer proyectos      |
| Usuario sin permiso de Task   | Solo lectura                                  |

Para dar permisos de creación de proyectos a un usuario, asígnale el rol **Projects User** o **Projects Manager**.

---

## 8. Desarrollo local (modo dev)

```bash
cd ~/frappe-bench/apps/task_flow/frontend
npm install
npm run dev
```

El servidor de desarrollo arranca en `http://localhost:5173` y hace proxy de las peticiones API al servidor Frappe en `http://127.0.0.1:8000`.

Si tu Frappe corre en otro puerto, edita el campo `target` en `frontend/vite.config.js`:

```js
proxy: {
  "/api": { target: "http://127.0.0.1:8000", ... },
  "/app": { target: "http://127.0.0.1:8000", ... },
}
```

---

## 9. Actualizar la app

```bash
cd ~/frappe-bench
bench update --apps task_flow
# o si solo el frontend cambió:
cd apps/task_flow/frontend && npm run build
bench --site misite.local clear-cache
```

---

## Resolución de problemas

| Problema | Solución |
|----------|----------|
| La página muestra 404 | Ejecuta `bench build --app task_flow` y `bench restart` |
| "No tienes permiso" al crear tarea | Verifica que tu usuario tenga el rol **Projects User** |
| El correo no se envía | Revisa la configuración de correo saliente en ERPNext |
| Los números de WhatsApp no aparecen | Agrega el teléfono móvil en el perfil del usuario en ERPNext |
| Asignaciones no se reflejan | Asegúrate de que el endpoint `task_flow.api.add_task_assignment` esté disponible — ejecuta `bench migrate` |
