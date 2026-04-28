<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-box">
      <div class="modal-header">
        <h3 class="modal-title">
          <span class="wa-icon">💬</span> Enviar por WhatsApp
        </h3>
        <button class="icon-btn" @click="$emit('close')"><XIcon :size="16" /></button>
      </div>

      <!-- No phone state -->
      <div v-if="!phone" class="no-phone">
        <AlertCircleIcon :size="32" class="no-phone-icon" />
        <p class="no-phone-msg">
          <strong>{{ assigneeName }}</strong> no tiene teléfono registrado.
        </p>
        <p class="no-phone-help">
          Para agregarlo, ve a
          <a :href="`/app/user/${encodeURIComponent(assigneeEmail)}`" target="_blank">
            ERPNext › Usuarios › {{ assigneeEmail }}
          </a>
          y completa el campo <em>Teléfono móvil</em>.
        </p>
        <button class="btn-cancel" @click="$emit('close')">Cerrar</button>
      </div>

      <!-- Preview state -->
      <template v-else>
        <div class="preview-section">
          <div class="preview-meta">
            <div class="meta-row">
              <span class="meta-label">Para:</span>
              <span class="meta-value">{{ assigneeName }} <span class="phone-badge">+{{ phone }}</span></span>
            </div>
          </div>

          <label class="field-label">Mensaje</label>
          <textarea
            v-model="message"
            class="message-input"
            rows="7"
          />
        </div>

        <div class="modal-actions">
          <button class="btn-primary" @click="send">
            <span>Abrir WhatsApp</span>
          </button>
          <button class="btn-cancel" @click="$emit('close')">Cancelar</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { XIcon, AlertCircleIcon } from "lucide-vue-next";
import { fmtDate, STATUS_LABEL } from "../../api/index.js";

const props = defineProps({
  task:         { type: Object, required: true },
  assigneeEmail:{ type: String, default: "" },
  assigneeName: { type: String, default: "" },
  rawPhone:     { type: String, default: "" },
});

const emit = defineEmits(["close"]);

// Sanitize to E.164 digits only (no +, no spaces, no dashes)
const phone = computed(() => {
  const digits = (props.rawPhone || "").replace(/\D/g, "");
  return digits || null;
});

function buildDefaultMessage() {
  const t = props.task;
  const lines = [
    `Hola ${props.assigneeName}!`,
    ``,
    `Te escribo sobre la tarea *${t.subject}*${t.project ? ` del proyecto _${t.project}_` : ""}.`,
    ``,
    `📋 Estado: ${STATUS_LABEL[t.status] || t.status}`,
    t.exp_end_date ? `📅 Fecha límite: ${fmtDate(t.exp_end_date)}` : null,
    t.progress     ? `📊 Progreso: ${t.progress}%` : null,
    ``,
    `¿Puedes revisar el avance y actualizar el estado?`,
    ``,
    `Gracias.`,
  ].filter(l => l !== null).join("\n");
  return lines;
}

const message = ref(buildDefaultMessage());

function send() {
  const url = `https://wa.me/${phone.value}?text=${encodeURIComponent(message.value)}`;
  window.open(url, "_blank");
  emit("close");
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
}
.modal-box {
  background: var(--tf-surface); border-radius: 10px;
  padding: 0; width: min(480px, 96vw);
  box-shadow: 0 20px 48px rgba(0,0,0,.25);
  overflow: hidden;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--tf-border);
}
.modal-title { margin: 0; font-size: 15px; font-weight: 700; color: var(--tf-text); display: flex; align-items: center; gap: 8px; }
.wa-icon { font-size: 18px; }

.icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border: none; background: transparent;
  border-radius: 6px; cursor: pointer; color: var(--tf-text-muted);
}
.icon-btn:hover { background: var(--tf-hover-bg); }

/* No phone */
.no-phone {
  padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center;
}
.no-phone-icon { color: var(--tf-overdue); }
.no-phone-msg { margin: 0; font-size: 14px; color: var(--tf-text); }
.no-phone-help { margin: 0; font-size: 13px; color: var(--tf-text-muted); line-height: 1.6; }
.no-phone-help a { color: var(--tf-primary); }

/* Preview */
.preview-section { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
.preview-meta { background: var(--tf-bg); border-radius: 6px; padding: 10px 12px; }
.meta-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.meta-label { color: var(--tf-text-faint); min-width: 40px; }
.meta-value { color: var(--tf-text); }
.phone-badge {
  font-size: 11px; padding: 1px 7px; border-radius: 999px;
  background: #f0fdf4; color: #16a34a;
  border: 1px solid #bbf7d0; margin-left: 6px;
}

.field-label { font-size: 11px; color: var(--tf-text-faint); text-transform: uppercase; letter-spacing: .04em; }
.message-input {
  width: 100%; padding: 10px; font-size: 13px;
  border: 1px solid var(--tf-border); border-radius: 6px;
  background: var(--tf-bg); color: var(--tf-text);
  font-family: inherit; resize: vertical; outline: none;
  line-height: 1.5;
  box-sizing: border-box;
}
.message-input:focus { border-color: var(--tf-primary); }

.modal-actions {
  padding: 12px 20px 16px;
  display: flex; gap: 8px; justify-content: flex-end;
  border-top: 1px solid var(--tf-border);
}
.btn-primary {
  padding: 8px 18px; background: #16a34a; color: #fff;
  border: none; border-radius: 6px; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: background 120ms;
}
.btn-primary:hover { background: #15803d; }
.btn-cancel {
  padding: 8px 14px; background: var(--tf-hover-bg); border: none;
  border-radius: 6px; color: var(--tf-text-muted); font-size: 13px; cursor: pointer;
}
</style>
