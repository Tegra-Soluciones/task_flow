<template>
  <div class="settings-page">
    <div class="page-header">
      <h2 class="page-title">Configuración</h2>
      <button class="btn-ghost" @click="prefs.reset()">Restablecer valores</button>
    </div>

    <div class="settings-card">
      <h3 class="card-title">Visualización</h3>

      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Mostrar tareas completadas</span>
          <span class="setting-desc">Incluye tareas con estado "Completada" en las vistas de lista y tablero.</span>
        </div>
        <label class="toggle">
          <input type="checkbox" v-model="prefs.showCompleted" />
          <span class="toggle-track" />
        </label>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Agrupar por proyecto</span>
          <span class="setting-desc">Agrupa las tareas por proyecto en lugar de mostrarlas en lista plana.</span>
        </div>
        <label class="toggle">
          <input type="checkbox" v-model="prefs.groupByProject" />
          <span class="toggle-track" />
        </label>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Tarjetas compactas</span>
          <span class="setting-desc">Reduce el tamaño de las tarjetas de tarea para ver más en pantalla.</span>
        </div>
        <label class="toggle">
          <input type="checkbox" v-model="prefs.compactCards" />
          <span class="toggle-track" />
        </label>
      </div>

      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Días "por vencer" ({{ prefs.dueSoonDays }})</span>
          <span class="setting-desc">Número de días antes del vencimiento para marcar una tarea como "por vencer".</span>
        </div>
        <input
          type="range"
          v-model.number="prefs.dueSoonDays"
          min="1" max="14"
          class="range-input"
        />
      </div>
    </div>

    <div class="settings-card">
      <h3 class="card-title">Acerca de</h3>
      <div class="about-grid">
        <div class="about-row"><span>Versión</span><span>1.0.0</span></div>
        <div class="about-row"><span>App</span><span>Task Flow</span></div>
        <div class="about-row"><span>Framework</span><span>Frappe / ERPNext</span></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePrefsStore } from "../stores/prefs.js";
const prefs = usePrefsStore();
</script>

<style scoped>
.settings-page {
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--tf-text); }

.btn-ghost {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid var(--tf-border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--tf-text-muted);
  cursor: pointer;
  transition: background 120ms;
}
.btn-ghost:hover { background: var(--tf-hover-bg); }

.settings-card {
  background: var(--tf-surface);
  border: 1px solid var(--tf-border);
  border-radius: 10px;
  overflow: hidden;
}

.card-title {
  margin: 0;
  padding: 14px 20px;
  font-size: 13px;
  font-weight: 700;
  color: var(--tf-text);
  border-bottom: 1px solid var(--tf-border);
  text-transform: uppercase;
  letter-spacing: .05em;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--tf-border);
}
.setting-row:last-child { border-bottom: none; }

.setting-info { display: flex; flex-direction: column; gap: 3px; }
.setting-label { font-size: 14px; color: var(--tf-text); }
.setting-desc { font-size: 12px; color: var(--tf-text-muted); line-height: 1.4; }

/* Toggle switch */
.toggle { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; cursor: pointer; }
.toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
.toggle-track {
  position: absolute; inset: 0;
  background: var(--tf-border);
  border-radius: 999px;
  transition: background 200ms;
}
.toggle-track::after {
  content: "";
  position: absolute;
  top: 3px; left: 3px;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 200ms;
  box-shadow: 0 1px 3px rgba(0,0,0,.2);
}
.toggle input:checked + .toggle-track { background: var(--tf-primary); }
.toggle input:checked + .toggle-track::after { transform: translateX(18px); }

/* Range */
.range-input {
  width: 140px;
  flex-shrink: 0;
  accent-color: var(--tf-primary);
}

/* About */
.about-grid { padding: 4px 0; }
.about-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 20px;
  font-size: 13px;
  color: var(--tf-text-muted);
  border-bottom: 1px solid var(--tf-border);
}
.about-row:last-child { border-bottom: none; }
.about-row span:last-child { color: var(--tf-text); font-weight: 500; }

@media (max-width: 700px) {
  .page-header,
  .setting-row,
  .about-row {
    flex-direction: column;
    align-items: stretch;
  }

  .range-input,
  .btn-ghost {
    width: 100%;
  }

  .toggle {
    align-self: flex-start;
  }
}
</style>
