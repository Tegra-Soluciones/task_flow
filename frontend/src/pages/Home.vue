<template>
  <div class="home-page">
    <!-- ── Hero ────────────────────────────────────────────────────────── -->
    <header class="hero">
      <div class="hero-text">
        <span class="hero-eyebrow">{{ greeting }}</span>
        <h1 class="hero-title">{{ userStore.displayName || "Bienvenido" }} 👋</h1>
        <p class="hero-sub">Aquí está el resumen de tus tareas y proyectos.</p>
      </div>
      <div class="hero-actions">
        <button class="btn-primary" @click="$router.push({ name: 'MyTasks' })">
          <CheckSquareIcon :size="14" /> Mis tareas
        </button>
        <button class="btn-ghost" @click="$router.push({ name: 'Dashboard' })">
          <LayoutDashboardIcon :size="14" /> Tablero
        </button>
      </div>
    </header>

    <div v-if="loading" class="center-wrap">
      <LoadingSpinner :size="36" label="Cargando…" />
    </div>

    <template v-else>
      <!-- ── KPI grid ────────────────────────────────────────────────── -->
      <section class="kpi-grid">
        <div class="kpi-card kpi-primary">
          <span class="kpi-label">Tareas activas</span>
          <span class="kpi-value">{{ kpis.active }}</span>
          <span class="kpi-foot">{{ kpis.total }} totales</span>
        </div>

        <div class="kpi-card kpi-info">
          <span class="kpi-label">Mis pendientes</span>
          <span class="kpi-value">{{ kpis.myPending }}</span>
          <span class="kpi-foot">asignadas a ti</span>
        </div>

        <div class="kpi-card kpi-danger">
          <span class="kpi-label">Vencidas</span>
          <span class="kpi-value">{{ kpis.overdue }}</span>
          <span class="kpi-foot">requieren atención</span>
        </div>

        <div class="kpi-card kpi-success">
          <span class="kpi-label">Completadas (7d)</span>
          <span class="kpi-value">{{ kpis.completedWeek }}</span>
          <span class="kpi-foot">últimos 7 días</span>
        </div>
      </section>

      <!-- ── Charts row ──────────────────────────────────────────────── -->
      <section class="charts-row">
        <!-- Donut: distribución por estado -->
        <div class="chart-card">
          <header class="chart-head">
            <h3 class="chart-title">Distribución por estado</h3>
            <span class="chart-sub">{{ kpis.active }} activas</span>
          </header>
          <div class="chart-body donut-body">
            <svg :viewBox="`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`" class="donut-svg">
              <circle
                :cx="DONUT_SIZE / 2" :cy="DONUT_SIZE / 2"
                :r="DONUT_R" fill="none"
                stroke="var(--tf-hover-bg)" stroke-width="22"
              />
              <circle
                v-for="seg in donutSegments"
                :key="seg.status"
                :cx="DONUT_SIZE / 2" :cy="DONUT_SIZE / 2"
                :r="DONUT_R" fill="none"
                :stroke="seg.color"
                stroke-width="22"
                :stroke-dasharray="`${seg.length} ${DONUT_CIRC}`"
                :stroke-dashoffset="seg.offset"
                :transform="`rotate(-90 ${DONUT_SIZE / 2} ${DONUT_SIZE / 2})`"
                stroke-linecap="butt"
              />
              <text
                :x="DONUT_SIZE / 2" :y="DONUT_SIZE / 2 - 4"
                text-anchor="middle"
                class="donut-center-num"
              >{{ kpis.active }}</text>
              <text
                :x="DONUT_SIZE / 2" :y="DONUT_SIZE / 2 + 14"
                text-anchor="middle"
                class="donut-center-lbl"
              >activas</text>
            </svg>
            <ul class="donut-legend">
              <li v-for="seg in donutSegments" :key="seg.status" class="legend-item">
                <span class="legend-dot" :style="{ background: seg.color }" />
                <span class="legend-label">{{ STATUS_LABEL[seg.status] || seg.status }}</span>
                <span class="legend-val">{{ seg.value }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Bars: prioridad -->
        <div class="chart-card">
          <header class="chart-head">
            <h3 class="chart-title">Por prioridad</h3>
            <span class="chart-sub">tareas activas</span>
          </header>
          <div class="chart-body bars-body">
            <div v-for="bar in priorityBars" :key="bar.key" class="bar-row">
              <span class="bar-label">{{ bar.label }}</span>
              <div class="bar-track">
                <div
                  class="bar-fill"
                  :style="{ width: bar.pct + '%', background: bar.color }"
                />
              </div>
              <span class="bar-val">{{ bar.value }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Trend: completadas últimos 7 días ───────────────────────── -->
      <section class="chart-card chart-trend">
        <header class="chart-head">
          <h3 class="chart-title">Completadas últimos 7 días</h3>
          <span class="chart-sub">{{ kpis.completedWeek }} en total</span>
        </header>
        <div class="trend-body">
          <svg :viewBox="`0 0 ${TREND_W} ${TREND_H}`" class="trend-svg" preserveAspectRatio="none">
            <!-- grid -->
            <line
              v-for="i in 4"
              :key="i"
              :x1="0" :x2="TREND_W"
              :y1="(i * TREND_H) / 4" :y2="(i * TREND_H) / 4"
              stroke="var(--tf-border)" stroke-dasharray="3 3"
            />
            <!-- area -->
            <path :d="trendPath.area" fill="url(#tfGradient)" opacity="0.3" />
            <!-- line -->
            <path :d="trendPath.line" fill="none" stroke="var(--tf-primary)" stroke-width="2.5" />
            <!-- points -->
            <circle
              v-for="(p, i) in trendPoints"
              :key="i"
              :cx="p.x" :cy="p.y"
              r="4" fill="var(--tf-primary)" stroke="#fff" stroke-width="2"
            />
            <defs>
              <linearGradient id="tfGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="var(--tf-primary)" stop-opacity="0.6" />
                <stop offset="100%" stop-color="var(--tf-primary)" stop-opacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <div class="trend-axis">
            <span v-for="(d, i) in last7Days" :key="i" class="trend-x-label">
              {{ d.short }}
            </span>
          </div>
        </div>
      </section>

      <!-- ── Próximas a vencer ──────────────────────────────────────── -->
      <section class="chart-card upcoming-card">
        <header class="chart-head">
          <h3 class="chart-title">Próximas a vencer</h3>
          <RouterLink :to="{ name: 'MyTasks' }" class="chart-link">Ver todas →</RouterLink>
        </header>
        <ul v-if="upcoming.length" class="upcoming-list">
          <li v-for="t in upcoming" :key="t.name" class="upcoming-row" @click="goToTask(t.name)">
            <span
              class="upcoming-priority-dot"
              :style="{ background: PRIORITY_COLOR[t.priority] || 'var(--tf-primary)' }"
            />
            <span class="upcoming-subject">{{ t.subject }}</span>
            <span v-if="t.project" class="upcoming-project">{{ t.project }}</span>
            <span
              class="upcoming-date"
              :class="{ overdue: isOverdue(t), today: isDueToday(t) }"
            >
              {{ fmtDate(t.exp_end_date) }}
            </span>
          </li>
        </ul>
        <p v-else class="upcoming-empty">No hay tareas próximas a vencer. 🎉</p>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { CheckSquareIcon, LayoutDashboardIcon } from "lucide-vue-next";
import LoadingSpinner from "../components/base/LoadingSpinner.vue";
import { useUserStore } from "../stores/user.js";
import {
  getTasks, fmtDate, isOverdue, isDueToday, todayISO,
  STATUS_LABEL,
} from "../api/index.js";

const router = useRouter();
const userStore = useUserStore();

const loading = ref(true);
const allTasks = ref([]);

// ── Donut geometry ──────────────────────────────────────────────────────────
const DONUT_SIZE = 160;
const DONUT_R    = 60;
const DONUT_CIRC = 2 * Math.PI * DONUT_R;

// ── Trend geometry ──────────────────────────────────────────────────────────
const TREND_W = 600;
const TREND_H = 140;

// ── Status color palette (same as Kanban) ──────────────────────────────────
const STATUS_COLOR_MAP = {
  Open:             "#2563eb",
  Working:          "#7c3aed",
  "Pending Review": "#d97706",
  Completed:        "#16a34a",
  Overdue:          "#dc2626",
};

const PRIORITY_COLOR = {
  Urgent: "#dc2626",
  High:   "#d97706",
  Medium: "var(--tf-primary)",
  Low:    "#6b7280",
};

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
});

// ── Load all relevant tasks ─────────────────────────────────────────────────
async function load() {
  loading.value = true;
  try {
    allTasks.value = await getTasks([
      ["status", "not in", ["Cancelled", "Template"]],
    ], { limit: 1000 });
  } finally {
    loading.value = false;
  }
}
onMounted(load);

// ── KPIs ────────────────────────────────────────────────────────────────────
const myEmail = computed(() => userStore.email);

const kpis = computed(() => {
  const tasks = allTasks.value;
  const active = tasks.filter(t => t.status !== "Completed").length;
  const overdue = tasks.filter(t => t.status !== "Completed" && isOverdue(t)).length;
  const myPending = tasks.filter(t =>
    t.status !== "Completed" && (t._assignees || []).includes(myEmail.value)
  ).length;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const completedWeek = tasks.filter(t => {
    if (t.status !== "Completed") return false;
    const mod = t.modified ? new Date(t.modified) : null;
    return mod && mod >= sevenDaysAgo;
  }).length;

  return {
    total: tasks.length,
    active,
    overdue,
    myPending,
    completedWeek,
  };
});

// ── Donut: distribución por estado (sólo activas) ──────────────────────────
const donutSegments = computed(() => {
  const active = allTasks.value.filter(t => t.status !== "Completed");
  const order = ["Open", "Working", "Pending Review", "Overdue"];
  const counts = order.map(status => {
    if (status === "Overdue") {
      return {
        status,
        value: allTasks.value.filter(t => t.status !== "Completed" && isOverdue(t)).length,
      };
    }
    return { status, value: active.filter(t => t.status === status && !isOverdue(t)).length };
  }).filter(s => s.value > 0);

  const total = counts.reduce((sum, s) => sum + s.value, 0) || 1;
  let acc = 0;
  return counts.map(s => {
    const length = (s.value / total) * DONUT_CIRC;
    const offset = -acc;
    acc += length;
    return { ...s, length, offset, color: STATUS_COLOR_MAP[s.status] };
  });
});

// ── Bars: prioridad ─────────────────────────────────────────────────────────
const priorityBars = computed(() => {
  const order = [
    { key: "Urgent", label: "Urgente", color: "#dc2626" },
    { key: "High",   label: "Alta",    color: "#d97706" },
    { key: "Medium", label: "Media",   color: "var(--tf-primary)" },
    { key: "Low",    label: "Baja",    color: "#6b7280" },
    { key: "_none",  label: "Sin prioridad", color: "#9ca3af" },
  ];
  const active = allTasks.value.filter(t => t.status !== "Completed");
  const max = Math.max(1, ...order.map(o =>
    active.filter(t => (o.key === "_none" ? !t.priority : t.priority === o.key)).length
  ));
  return order.map(o => {
    const value = active.filter(t =>
      o.key === "_none" ? !t.priority : t.priority === o.key
    ).length;
    return { ...o, value, pct: (value / max) * 100 };
  }).filter(b => b.value > 0);
});

// ── Trend: completadas últimos 7 días ──────────────────────────────────────
const last7Days = computed(() => {
  const days = [];
  const dayShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push({
      iso: d.toISOString().slice(0, 10),
      short: dayShort[d.getDay()],
      date: d,
    });
  }
  return days;
});

const trendPoints = computed(() => {
  const counts = last7Days.value.map(day => {
    const count = allTasks.value.filter(t => {
      if (t.status !== "Completed") return false;
      const mod = t.modified ? t.modified.slice(0, 10) : null;
      return mod === day.iso;
    }).length;
    return count;
  });
  const max = Math.max(1, ...counts);
  const padX = 30;
  const padY = 16;
  const innerW = TREND_W - padX * 2;
  const innerH = TREND_H - padY * 2;
  return counts.map((c, i) => ({
    x: padX + (i * innerW) / Math.max(1, counts.length - 1),
    y: padY + innerH - (c / max) * innerH,
    value: c,
  }));
});

const trendPath = computed(() => {
  const pts = trendPoints.value;
  if (!pts.length) return { line: "", area: "" };
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1].x} ${TREND_H - 16} L ${pts[0].x} ${TREND_H - 16} Z`;
  return { line, area };
});

// ── Próximas a vencer (top 6) ──────────────────────────────────────────────
const upcoming = computed(() => {
  const today = todayISO();
  return [...allTasks.value]
    .filter(t => t.status !== "Completed" && t.exp_end_date)
    .sort((a, b) => a.exp_end_date.localeCompare(b.exp_end_date))
    .filter(t => t.exp_end_date >= today || isOverdue(t))
    .slice(0, 6);
});

function goToTask(name) {
  router.push({ name: "TaskDetail", params: { name } });
}
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1320px;
  width: 100%;
  margin: 0 auto;
  padding-bottom: 32px;
}

.center-wrap {
  display: flex; align-items: center; justify-content: center;
  min-height: 240px;
}

/* ── Hero ─────────────────────────────────────────────────────────────── */
.hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 28px;
  border-radius: 18px;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--tf-primary) 12%, var(--tf-surface)),
    var(--tf-surface) 60%);
  border: 1px solid color-mix(in srgb, var(--tf-primary) 18%, var(--tf-border));
  box-shadow: 0 12px 32px rgba(15, 23, 42, .05);
  flex-wrap: wrap;
}
.hero-text { display: flex; flex-direction: column; gap: 4px; }
.hero-eyebrow {
  font-size: 12px;
  font-weight: 600;
  color: var(--tf-primary);
  text-transform: uppercase;
  letter-spacing: .08em;
}
.hero-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--tf-text);
  line-height: 1.15;
}
.hero-sub {
  margin: 0;
  font-size: 13px;
  color: var(--tf-text-muted);
}
.hero-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.btn-primary,
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 120ms, border-color 120ms;
  font-family: inherit;
}
.btn-primary { background: var(--tf-primary); color: #fff; }
.btn-primary:hover { background: var(--tf-primary-hover); }
.btn-ghost {
  background: var(--tf-surface);
  color: var(--tf-text);
  border-color: var(--tf-border);
}
.btn-ghost:hover { background: var(--tf-hover-bg); }

/* ── KPI grid ─────────────────────────────────────────────────────────── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}
.kpi-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 18px;
  border: 1px solid var(--tf-border);
  border-radius: 14px;
  background: var(--tf-surface);
  position: relative;
  overflow: hidden;
  transition: box-shadow 140ms, transform 140ms;
}
.kpi-card::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--tf-primary);
}
.kpi-card.kpi-info::before    { background: #2563eb; }
.kpi-card.kpi-danger::before  { background: var(--tf-overdue); }
.kpi-card.kpi-success::before { background: #16a34a; }
.kpi-card:hover { box-shadow: 0 8px 22px rgba(15, 23, 42, .08); transform: translateY(-2px); }

.kpi-label { font-size: 12px; color: var(--tf-text-muted); font-weight: 600; }
.kpi-value { font-size: 28px; font-weight: 700; color: var(--tf-text); line-height: 1.1; }
.kpi-foot  { font-size: 11px; color: var(--tf-text-faint); }

/* ── Charts ───────────────────────────────────────────────────────────── */
.charts-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
}

.chart-card {
  background: var(--tf-surface);
  border: 1px solid var(--tf-border);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, .03);
}
.chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.chart-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--tf-text);
  text-transform: uppercase;
  letter-spacing: .04em;
}
.chart-sub {
  font-size: 11px;
  color: var(--tf-text-faint);
}
.chart-link {
  font-size: 12px;
  color: var(--tf-primary);
  text-decoration: none;
  font-weight: 500;
}
.chart-link:hover { text-decoration: underline; }

/* ── Donut ─────────────────────────────────────────────────────────── */
.donut-body {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}
.donut-svg {
  width: 160px;
  height: 160px;
  flex-shrink: 0;
}
:deep(.donut-center-num) {
  font-size: 22px;
  font-weight: 700;
  fill: var(--tf-text);
}
:deep(.donut-center-lbl) {
  font-size: 10px;
  fill: var(--tf-text-faint);
  text-transform: uppercase;
  letter-spacing: .06em;
}

.donut-legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 140px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--tf-text);
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}
.legend-label { flex: 1; }
.legend-val { font-weight: 700; color: var(--tf-text); }

/* ── Bars ─────────────────────────────────────────────────────────── */
.bars-body {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.bar-row {
  display: grid;
  grid-template-columns: 100px 1fr 36px;
  align-items: center;
  gap: 10px;
}
.bar-label {
  font-size: 12px;
  color: var(--tf-text-muted);
  white-space: nowrap;
}
.bar-track {
  height: 10px;
  background: var(--tf-hover-bg);
  border-radius: 999px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 400ms cubic-bezier(.2,.8,.2,1);
}
.bar-val {
  font-size: 12px;
  font-weight: 700;
  color: var(--tf-text);
  text-align: right;
}

/* ── Trend ────────────────────────────────────────────────────────── */
.trend-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.trend-svg {
  width: 100%;
  height: 140px;
  display: block;
}
.trend-axis {
  display: flex;
  justify-content: space-between;
  padding: 0 30px;
}
.trend-x-label {
  font-size: 10px;
  color: var(--tf-text-faint);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .04em;
}

/* ── Upcoming ─────────────────────────────────────────────────────── */
.upcoming-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.upcoming-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--tf-border);
  cursor: pointer;
  transition: background 100ms;
}
.upcoming-row:last-child { border-bottom: none; }
.upcoming-row:hover { background: var(--tf-hover-bg); }
.upcoming-priority-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.upcoming-subject {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--tf-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.upcoming-project {
  font-size: 11px;
  color: var(--tf-text-muted);
  background: var(--tf-hover-bg);
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.upcoming-date {
  font-size: 11px;
  font-weight: 600;
  color: var(--tf-text-muted);
  white-space: nowrap;
}
.upcoming-date.overdue { color: var(--tf-overdue); }
.upcoming-date.today   { color: #d97706; }

.upcoming-empty {
  margin: 0;
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: var(--tf-text-muted);
}

/* ── Responsive ───────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .charts-row { grid-template-columns: 1fr; }
  .donut-body { justify-content: center; }
  .donut-legend { min-width: 0; }
}

@media (max-width: 640px) {
  .hero { padding: 18px 18px; }
  .hero-title { font-size: 22px; }
  .chart-card { padding: 14px; }
  .bar-row { grid-template-columns: 80px 1fr 32px; }
  .upcoming-project { display: none; }
}
</style>
