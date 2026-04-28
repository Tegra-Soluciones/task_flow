<template>
  <div class="modal-backdrop" @click.self="!sending && $emit('close')">
    <div class="modal-box">
      <div class="modal-header">
        <h3 class="modal-title"><MailIcon :size="16" /> Enviar correo</h3>
        <button class="icon-btn" :disabled="sending" @click="$emit('close')">
          <XIcon :size="16" />
        </button>
      </div>

      <div class="modal-body">
        <div class="field">
          <label class="field-label">Para</label>
          <input v-model="form.to" class="field-input" type="email" />
        </div>
        <div class="field">
          <label class="field-label">Asunto</label>
          <input v-model="form.subject" class="field-input" />
        </div>
        <div class="field">
          <label class="field-label">Mensaje</label>
          <textarea v-model="form.message" class="field-textarea" rows="8" />
        </div>

        <div v-if="error" class="error-banner">{{ error }}</div>
        <div v-if="sent" class="success-banner">✓ Correo enviado correctamente.</div>
      </div>

      <div class="modal-actions">
        <button class="btn-primary" :disabled="sending || sent || !form.to" @click="send">
          {{ sending ? "Enviando…" : sent ? "Enviado" : "Enviar correo" }}
        </button>
        <button class="btn-cancel" @click="$emit('close')">
          {{ sent ? "Cerrar" : "Cancelar" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { XIcon, MailIcon } from "lucide-vue-next";
import { sendTaskEmail, fmtDate, STATUS_LABEL } from "../../api/index.js";

const props = defineProps({
  task:         { type: Object, required: true },
  assigneeEmail:{ type: String, default: "" },
  assigneeName: { type: String, default: "" },
});

const emit = defineEmits(["close", "sent"]);

const t = props.task;

function buildSubject() {
  return `[Task Flow] Recordatorio: ${t.subject}`;
}

function buildMessage() {
  const lines = [
    `Hola ${props.assigneeName || props.assigneeEmail},`,
    ``,
    `Te enviamos un recordatorio sobre la siguiente tarea:`,
    ``,
    `  Tarea:       ${t.subject}`,
    t.project  ? `  Proyecto:    ${t.project}` : null,
    `  Estado:      ${STATUS_LABEL[t.status] || t.status}`,
    t.exp_end_date ? `  Vencimiento: ${fmtDate(t.exp_end_date)}` : null,
    t.progress     ? `  Progreso:    ${t.progress}%` : null,
    ``,
    `Por favor, revisa el avance y actualiza el estado en Task Flow.`,
    ``,
    `Saludos,`,
    `Task Flow`,
  ].filter(l => l !== null).join("\n");
  return lines;
}

const form = reactive({
  to:      props.assigneeEmail,
  subject: buildSubject(),
  message: buildMessage(),
});

const sending = ref(false);
const sent    = ref(false);
const error   = ref("");

async function send() {
  if (!form.to.trim()) return;
  sending.value = true;
  error.value   = "";
  try {
    await sendTaskEmail(t.name, form.to, form.subject, form.message);
    sent.value = true;
    emit("sent");
  } catch (e) {
    error.value = "Error al enviar el correo. Verifica que el servidor de correo esté configurado en ERPNext.";
  } finally {
    sending.value = false;
  }
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
  width: min(520px, 96vw);
  box-shadow: 0 20px 48px rgba(0,0,0,.25);
  overflow: hidden;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--tf-border);
}
.modal-title { margin: 0; font-size: 15px; font-weight: 700; color: var(--tf-text); display: flex; align-items: center; gap: 8px; }
.icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border: none; background: transparent;
  border-radius: 6px; cursor: pointer; color: var(--tf-text-muted);
}
.icon-btn:hover:not(:disabled) { background: var(--tf-hover-bg); }

.modal-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }

.field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 11px; color: var(--tf-text-faint); text-transform: uppercase; letter-spacing: .04em; }
.field-input, .field-textarea {
  width: 100%; padding: 8px 10px;
  border: 1px solid var(--tf-border); border-radius: 6px;
  background: var(--tf-bg); color: var(--tf-text);
  font-size: 13px; outline: none; font-family: inherit;
  box-sizing: border-box;
}
.field-input:focus, .field-textarea:focus { border-color: var(--tf-primary); }
.field-textarea { resize: vertical; line-height: 1.5; }

.error-banner {
  padding: 8px 12px; background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 6px; font-size: 12px; color: var(--tf-overdue);
}
.success-banner {
  padding: 8px 12px; background: #f0fdf4; border: 1px solid #bbf7d0;
  border-radius: 6px; font-size: 12px; color: #16a34a; font-weight: 500;
}

.modal-actions {
  padding: 12px 20px 16px;
  display: flex; gap: 8px; justify-content: flex-end;
  border-top: 1px solid var(--tf-border);
}
.btn-primary {
  padding: 8px 18px; background: var(--tf-primary); color: #fff;
  border: none; border-radius: 6px; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: background 120ms;
}
.btn-primary:hover:not(:disabled) { background: var(--tf-primary-hover); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-cancel {
  padding: 8px 14px; background: var(--tf-hover-bg); border: none;
  border-radius: 6px; color: var(--tf-text-muted); font-size: 13px; cursor: pointer;
}
</style>
