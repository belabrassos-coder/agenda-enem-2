/* ═══════════════════════════════════════
   ENEM PLANNER — script.js
   ═══════════════════════════════════════ */

'use strict';

// ── STATE ────────────────────────────────────────────────────────────────────
const STATE_KEY = 'enem_planner_v2';

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY)) || defaultState();
  } catch {
    return defaultState();
  }
}

function defaultState() {
  return {
    tarefas: [],
    questoes: [],
    materias: [],
    tempo: [],
    semana: [],
    streak: 0,
    lastStudyDate: null,
  };
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

let state = loadState();

// ── TABS ─────────────────────────────────────────────────────────────────────
const tabTitles = {
  hoje:     'Tarefas de Hoje',
  questoes: 'Questões Resolvidas',
  materias: 'Matérias Estudadas',
  tempo:    'Tempo de Estudo',
  semana:   'Planejamento Semanal',
  resumo:   'Resumo Geral',
};

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');

    document.getElementById('tabTitle').textContent = tabTitles[tab];

    if (tab === 'resumo') renderResumo();
    if (tab === 'tempo')  renderTempoBars();
    if (tab === 'materias') renderMaterias();
    if (tab === 'questoes') renderQuestoes();
    if (tab === 'hoje') renderTarefas();
    if (tab === 'semana') renderWeek();
  });
});

// Date header
function setDate() {
  const now = new Date();
  document.getElementById('tabDate').textContent = now.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}
setDate();

// Default dates to today
function todayStr() {
  return new Date().toISOString().split('T')[0];
}
['qData','mData'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.value = todayStr();
});

// ── TOAST ────────────────────────────────────────────────────────────────────
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

// ── STREAK ───────────────────────────────────────────────────────────────────
function updateStreak() {
  const today = todayStr();
  if (state.lastStudyDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    if (state.lastStudyDate === yStr) {
      state.streak = (state.streak || 0) + 1;
    } else {
      state.streak = 1;
    }
    state.lastStudyDate = today;
    saveState();
  }
  document.getElementById('streakCount').textContent = state.streak || 0;
}

// ── TAB: HOJE ────────────────────────────────────────────────────────────────
document.getElementById('addTarefa').addEventListener('click', addTarefa);
document.getElementById('tarefaInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTarefa();
});

function addTarefa() {
  const text = document.getElementById('tarefaInput').value.trim();
  if (!text) return toast('Digite uma tarefa primeiro.');
  const prioridade = document.getElementById('tarefaPrioridade').value;

  state.tarefas.push({ id: Date.now(), text, prioridade, done: false });
  saveState();
  document.getElementById('tarefaInput').value = '';
  renderTarefas();
  toast('Tarefa adicionada!');
}

function renderTarefas() {
  const list = document.getElementById('taskList');
  const empty = document.getElementById('emptyTarefas');
  const tarefas = state.tarefas;

  list.innerHTML = '';

  if (!tarefas.length) {
    empty.style.display = '';
    updateProgress(0, 0);
    return;
  }
  empty.style.display = 'none';

  tarefas.forEach(t => {
    const li = document.createElement('li');
    li.className = `task-item${t.done ? ' done' : ''}`;
    li.innerHTML = `
      <div class="task-checkbox${t.done ? ' checked' : ''}" data-id="${t.id}">
        ${t.done ? '✓' : ''}
      </div>
      <span class="task-text">${escHtml(t.text)}</span>
      <span class="task-priority priority-${t.prioridade}">${t.prioridade}</span>
      <button class="task-del" data-id="${t.id}" title="Remover">✕</button>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll('.task-checkbox').forEach(cb => {
    cb.addEventListener('click', () => toggleTarefa(+cb.dataset.id));
  });
  list.querySelectorAll('.task-del').forEach(btn => {
    btn.addEventListener('click', () => deleteTarefa(+btn.dataset.id));
  });

  const done = tarefas.filter(t => t.done).length;
  updateProgress(done, tarefas.length);
}

function toggleTarefa(id) {
  const t = state.tarefas.find(x => x.id === id);
  if (t) { t.done = !t.done; saveState(); renderTarefas(); }
}

function deleteTarefa(id) {
  state.tarefas = state.tarefas.filter(x => x.id !== id);
  saveState();
  renderTarefas();
}

function updateProgress(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('progressLabel').textContent = pct + '%';
  document.getElementById('progressHint').textContent = total
    ? `${done} de ${total} tarefas concluídas`
    : 'Nenhuma tarefa para hoje.';
}

// ── TAB: QUESTÕES ────────────────────────────────────────────────────────────
document.getElementById('addQuestoes').addEventListener('click', addQuestoes);

function addQuestoes() {
  const materia   = document.getElementById('qMateria').value;
  const quantidade = +document.getElementById('qQuantidade').value;
  const acertos   = +document.getElementById('qAcertos').value;
  const data      = document.getElementById('qData').value;

  if (!materia) return toast('Selecione uma matéria.');
  if (!quantidade || quantidade < 1) return toast('Informe a quantidade de questões.');
  if (acertos > quantidade) return toast('Acertos não pode ser maior que o total.');
  if (!data) return toast('Informe a data.');

  state.questoes.push({ id: Date.now(), materia, quantidade, acertos, data });
  saveState();
  updateStreak();

  document.getElementById('qMateria').value = '';
  document.getElementById('qQuantidade').value = '';
  document.getElementById('qAcertos').value = '';

  renderQuestoes();
  toast('Questões salvas!');
}

function renderQuestoes() {
  const body  = document.getElementById('questoesBody');
  const empty = document.getElementById('emptyQuestoes');
  const rows  = [...state.questoes].sort((a,b) => b.data.localeCompare(a.data));

  body.innerHTML = '';

  if (!rows.length) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  rows.forEach(q => {
    const pct = q.quantidade ? Math.round((q.acertos / q.quantidade) * 100) : 0;
    const cls = pct >= 70 ? 'good' : pct >= 50 ? 'mid' : 'bad';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(q.data)}</td>
      <td>${escHtml(q.materia)}</td>
      <td>${q.quantidade}</td>
      <td>${q.acertos}</td>
      <td><span class="tag-pct ${cls}">${pct}%</span></td>
      <td><button class="btn-del-row" data-id="${q.id}">✕</button></td>
    `;
    body.appendChild(tr);
  });

  body.querySelectorAll('.btn-del-row').forEach(btn => {
    btn.addEventListener('click', () => {
      state.questoes = state.questoes.filter(x => x.id !== +btn.dataset.id);
      saveState();
      renderQuestoes();
    });
  });
}

// ── TAB: MATÉRIAS ────────────────────────────────────────────────────────────
document.getElementById('addMateria').addEventListener('click', addMateria);

function addMateria() {
  const materia = document.getElementById('mMateria').value;
  const topico  = document.getElementById('mTopico').value.trim();
  const tempo   = +document.getElementById('mTempo').value;
  const data    = document.getElementById('mData').value;
  const nota    = document.getElementById('mNota').value.trim();

  if (!materia) return toast('Selecione uma matéria.');
  if (!tempo || tempo < 1) return toast('Informe o tempo de estudo.');
  if (!data) return toast('Informe a data.');

  state.materias.push({ id: Date.now(), materia, topico, tempo, data, nota });
  saveState();
  updateStreak();

  document.getElementById('mMateria').value = '';
  document.getElementById('mTopico').value = '';
  document.getElementById('mTempo').value = '';
  document.getElementById('mNota').value = '';

  renderMaterias();
  toast('Sessão salva!');
}

function renderMaterias() {
  const chips  = document.getElementById('materiasChips');
  const body   = document.getElementById('materiasBody');
  const emptyC = document.getElementById('emptyMaterias');

  const rows = [...state.materias].sort((a,b) => b.data.localeCompare(a.data));

  // chips — matérias únicas
  const uniq = [...new Set(state.materias.map(m => m.materia))];
  chips.innerHTML = '';
  if (uniq.length) {
    emptyC.style.display = 'none';
    uniq.forEach(u => {
      const span = document.createElement('span');
      span.className = 'materia-chip';
      span.textContent = u;
      chips.appendChild(span);
    });
  } else {
    emptyC.style.display = '';
  }

  // table
  body.innerHTML = '';
  rows.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(m.data)}</td>
      <td>${escHtml(m.materia)}</td>
      <td>${escHtml(m.topico || '—')}</td>
      <td>${m.tempo} min</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(m.nota || '—')}</td>
      <td><button class="btn-del-row" data-id="${m.id}">✕</button></td>
    `;
    body.appendChild(tr);
  });

  body.querySelectorAll('.btn-del-row').forEach(btn => {
    btn.addEventListener('click', () => {
      state.materias = state.materias.filter(x => x.id !== +btn.dataset.id);
      saveState();
      renderMaterias();
    });
  });
}

// ── TAB: TEMPO ───────────────────────────────────────────────────────────────
let timerInterval = null;
let timerSeconds  = 0;
let timerRunning  = false;

document.getElementById('btnStart').addEventListener('click', startTimer);
document.getElementById('btnPause').addEventListener('click', pauseTimer);
document.getElementById('btnStop').addEventListener('click', stopTimer);

function startTimer() {
  if (!document.getElementById('timerMateria').value)
    return toast('Selecione uma matéria primeiro.');
  timerRunning = true;
  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerDisplay();
  }, 1000);
  document.getElementById('btnStart').disabled = true;
  document.getElementById('btnPause').disabled = false;
  document.getElementById('btnStop').disabled  = false;
}

function pauseTimer() {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    document.getElementById('btnStart').disabled = false;
    document.getElementById('btnPause').disabled = true;
    document.getElementById('btnStart').textContent = '▶ Retomar';
  }
}

function stopTimer() {
  clearInterval(timerInterval);
  timerRunning = false;

  if (timerSeconds > 0) {
    const materia = document.getElementById('timerMateria').value;
    const min = Math.round(timerSeconds / 60) || 1;
    state.tempo.push({ id: Date.now(), materia, duracao: min, data: todayStr() });
    saveState();
    updateStreak();
    renderTempoBars();
    renderTempoTable();
    toast(`Sessão de ${formatMin(min)} salva!`);
  }

  timerSeconds = 0;
  updateTimerDisplay();
  document.getElementById('btnStart').disabled = false;
  document.getElementById('btnPause').disabled = true;
  document.getElementById('btnStop').disabled  = true;
  document.getElementById('btnStart').textContent = '▶ Iniciar';
  document.getElementById('timerMateria').value = '';
}

function updateTimerDisplay() {
  const h = String(Math.floor(timerSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(timerSeconds % 60).padStart(2, '0');
  document.getElementById('timerDisplay').textContent = `${h}:${m}:${s}`;
}

function renderTempoBars() {
  const container = document.getElementById('tempoBars');
  const empty     = document.getElementById('emptyTempo');
  renderBarsByMateria(container, empty, state.tempo);
}

function renderTempoTable() {
  const body  = document.getElementById('tempoBody');
  const rows  = [...state.tempo].sort((a,b) => b.data.localeCompare(a.data));

  body.innerHTML = '';
  rows.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(t.data)}</td>
      <td>${escHtml(t.materia)}</td>
      <td>${formatMin(t.duracao)}</td>
      <td><button class="btn-del-row" data-id="${t.id}">✕</button></td>
    `;
    body.appendChild(tr);
  });

  body.querySelectorAll('.btn-del-row').forEach(btn => {
    btn.addEventListener('click', () => {
      state.tempo = state.tempo.filter(x => x.id !== +btn.dataset.id);
      saveState();
      renderTempoBars();
      renderTempoTable();
    });
  });
}

// ── TAB: RESUMO ──────────────────────────────────────────────────────────────
function renderResumo() {
  // Stats cards
  const totalQ = state.questoes.reduce((s, q) => s + q.quantidade, 0);
  const totalA = state.questoes.reduce((s, q) => s + q.acertos, 0);
  const pct    = totalQ ? Math.round((totalA / totalQ) * 100) : 0;
  const totalT = state.tempo.reduce((s, t) => s + t.duracao, 0);
  const uniqM  = new Set([...state.materias.map(m=>m.materia), ...state.tempo.map(t=>t.materia)]).size;

  document.getElementById('statQuestoes').textContent = totalQ;
  document.getElementById('statAcertos').textContent  = pct + '%';
  document.getElementById('statTempo').textContent    = totalT >= 60
    ? (totalT / 60).toFixed(1) + 'h'
    : totalT + 'min';
  document.getElementById('statMaterias').textContent = uniqM;

  // Tempo bars
  renderBarsByMateria(
    document.getElementById('resumoTempoBars'),
    document.getElementById('emptyResumo'),
    state.tempo
  );

  // Aproveitamento por matéria
  const listEl = document.getElementById('aproveitamentoList');
  const emptyA = document.getElementById('emptyAproveitamento');
  listEl.innerHTML = '';

  const porMateria = {};
  state.questoes.forEach(q => {
    if (!porMateria[q.materia]) porMateria[q.materia] = { total: 0, acertos: 0 };
    porMateria[q.materia].total   += q.quantidade;
    porMateria[q.materia].acertos += q.acertos;
  });

  const entries = Object.entries(porMateria);
  if (!entries.length) {
    emptyA.style.display = '';
    return;
  }
  emptyA.style.display = 'none';

  entries
    .sort((a,b) => (b[1].acertos/b[1].total) - (a[1].acertos/a[1].total))
    .forEach(([mat, d]) => {
      const p   = d.total ? Math.round((d.acertos / d.total) * 100) : 0;
      const cls = p >= 70 ? 'good' : p >= 50 ? 'mid' : 'bad';
      const div = document.createElement('div');
      div.className = 'aprov-row';
      div.innerHTML = `
        <span class="aprov-label">${escHtml(mat)}</span>
        <div class="aprov-track"><div class="aprov-fill ${cls}" style="width:${p}%"></div></div>
        <span class="aprov-pct">${p}%</span>
      `;
      listEl.appendChild(div);
    });
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function renderBarsByMateria(container, emptyEl, source) {
  container.innerHTML = '';
  const map = {};
  source.forEach(t => {
    map[t.materia] = (map[t.materia] || 0) + t.duracao;
  });

  const entries = Object.entries(map);
  if (!entries.length) {
    if (emptyEl) emptyEl.style.display = '';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  const max = Math.max(...entries.map(e => e[1]));
  entries
    .sort((a,b) => b[1] - a[1])
    .forEach(([mat, min]) => {
      const pct = Math.round((min / max) * 100);
      const div = document.createElement('div');
      div.className = 'tempo-bar-row';
      div.innerHTML = `
        <span class="tempo-bar-label">${escHtml(mat)}</span>
        <div class="tempo-bar-track"><div class="tempo-bar-fill" style="width:${pct}%"></div></div>
        <span class="tempo-bar-val">${formatMin(min)}</span>
      `;
      container.appendChild(div);
    });
}

function formatDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function formatMin(min) {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${m}min` : `${h}h`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ── TAB: SEMANA ──────────────────────────────────────────────────────────────
const DIAS_NOMES = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const DIAS_NOMES_FULL = ['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];

// weekOffset: 0 = semana atual, -1 = anterior, etc.
let weekOffset = 0;

// Get Monday of week for a given offset (0=current week)
function getMondayOfWeek(offset) {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day); // Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + offset * 7);
  monday.setHours(0,0,0,0);
  return monday;
}

function getWeekDates(offset) {
  const monday = getMondayOfWeek(offset);
  return Array.from({length: 7}, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function dateToStr(d) {
  return d.toISOString().split('T')[0];
}

function updateWeekLabel() {
  const dates = getWeekDates(weekOffset);
  const fmt = d => d.toLocaleDateString('pt-BR', {day:'numeric', month:'short'});
  document.getElementById('weekLabel').textContent =
    `${fmt(dates[0])} — ${fmt(dates[6])} ${dates[0].getFullYear()}`;
}

document.getElementById('btnWeekPrev').addEventListener('click', () => {
  weekOffset--; renderWeek();
});
document.getElementById('btnWeekNext').addEventListener('click', () => {
  weekOffset++; renderWeek();
});

document.getElementById('addWeekTask').addEventListener('click', () => {
  const dia      = document.getElementById('wDia').value;
  const ativ     = document.getElementById('wAtividade').value.trim();
  const horario  = document.getElementById('wHorario').value;
  const tipo     = document.getElementById('wTipo').value;

  if (dia === '') return toast('Selecione o dia da semana.');
  if (!ativ)      return toast('Informe a atividade.');

  const dates = getWeekDates(weekOffset);
  const dateStr = dateToStr(dates[+dia]);

  if (!state.semana) state.semana = [];
  state.semana.push({ id: Date.now(), dateStr, dia: +dia, atividade: ativ, horario, tipo, done: false });
  saveState();

  document.getElementById('wDia').value = '';
  document.getElementById('wAtividade').value = '';
  document.getElementById('wHorario').value = '';
  document.getElementById('wTipo').value = 'estudo';

  renderWeek();
  toast('Adicionado ao planejamento!');
});

function renderWeek() {
  updateWeekLabel();
  const grid  = document.getElementById('weekGrid');
  const dates = getWeekDates(weekOffset);
  const todayStr_ = todayStr();

  if (!state.semana) state.semana = [];

  grid.innerHTML = '';

  dates.forEach((date, i) => {
    const ds   = dateToStr(date);
    const tasks = state.semana.filter(t => t.dateStr === ds);
    const isToday = ds === todayStr_;

    const col = document.createElement('div');
    col.className = `week-day-col${isToday ? ' is-today' : ''}`;

    // Header
    const hdr = document.createElement('div');
    hdr.className = 'week-day-header';
    hdr.innerHTML = `
      <span class="week-day-name">${DIAS_NOMES[i]}</span>
      <span class="week-day-date">${date.getDate()}</span>
    `;
    col.appendChild(hdr);

    // Tasks
    const taskWrap = document.createElement('div');
    taskWrap.className = 'week-day-tasks';

    if (!tasks.length) {
      taskWrap.innerHTML = '<span class="week-day-empty">—</span>';
    } else {
      // Sort by horario
      const sorted = [...tasks].sort((a,b) => (a.horario||'99:99').localeCompare(b.horario||'99:99'));
      sorted.forEach(t => {
        const item = document.createElement('div');
        item.className = `week-task-item wt-${t.tipo}${t.done ? ' done-w' : ''}`;
        item.innerHTML = `
          <div class="week-task-cb${t.done ? ' checked' : ''}" data-id="${t.id}">${t.done ? '✓' : ''}</div>
          <span class="week-task-text">${escHtml(t.atividade)}</span>
          ${t.horario ? `<span class="week-task-time">${t.horario}</span>` : ''}
          <button class="week-task-del" data-id="${t.id}">✕</button>
        `;
        taskWrap.appendChild(item);
      });
    }
    col.appendChild(taskWrap);

    // Footer progress
    const done  = tasks.filter(t => t.done).length;
    const total = tasks.length;
    const pct   = total ? Math.round((done / total) * 100) : 0;
    const footer = document.createElement('div');
    footer.className = 'week-day-footer';
    footer.innerHTML = `
      <div class="week-mini-track"><div class="week-mini-fill" style="width:${pct}%"></div></div>
      <span class="week-day-pct">${total ? pct + '%' : ''}</span>
    `;
    col.appendChild(footer);

    grid.appendChild(col);
  });

  // Events
  grid.querySelectorAll('.week-task-cb').forEach(cb => {
    cb.addEventListener('click', () => {
      const t = state.semana.find(x => x.id === +cb.dataset.id);
      if (t) { t.done = !t.done; saveState(); renderWeek(); }
    });
  });
  grid.querySelectorAll('.week-task-del').forEach(btn => {
    btn.addEventListener('click', () => {
      state.semana = state.semana.filter(x => x.id !== +btn.dataset.id);
      saveState();
      renderWeek();
    });
  });
}


document.getElementById('btnReset').addEventListener('click', () => {
  if (confirm('Tem certeza? Todos os dados serão apagados.')) {
    localStorage.removeItem(STATE_KEY);
    state = defaultState();
    renderTarefas();
    renderQuestoes();
    renderMaterias();
    renderTempoBars();
    renderTempoTable();
    document.getElementById('streakCount').textContent = '0';
    toast('Dados apagados.');
  }
});

// ── INIT ─────────────────────────────────────────────────────────────────────
(function init() {
  renderTarefas();
  renderQuestoes();
  renderMaterias();
  renderTempoBars();
  renderTempoTable();
  document.getElementById('streakCount').textContent = state.streak || 0;
})();
