import { $, api, toast, setUnauthorizedHandler } from './js/api/client.js';
import { state, sections, singular, pks, find, name, current, getFilteredRows } from './js/state.js';
import { esc, date, money, day, initials, person, badge, status, table, heading, rowButtons } from './js/ui/templates.js';
import { icon } from './js/ui/icons.js';
import { edit, detail, confirmAction, passwordModal } from './js/controllers/forms.js';

setUnauthorizedHandler(() => login());

export async function refresh() {
  state.data = await api('/data');
  render();
}

export function login() {
  state.user = null;
  $('#app').innerHTML = `<div class="login">
    <section class="login-intro">
      <div class="brand"><span class="brandmark">s</span>signy<span>®</span></div>
      <span class="eyebrow">Mais movimento. Menos burocracia.</span>
      <h1>Uma academia<br>bem cuidada<br>começa aqui.</h1>
      <p>Alunos, treinos e rotina em um só lugar. Mais tempo para o que importa: transformar vidas pelo movimento.</p>
    </section>
    <section class="login-main">
      <form class="login-form" id="login-form">
        <span class="eyebrow">Bem-vindo ao Signy</span>
        <h2>Vamos começar?</h2>
        <p>Acesse sua conta para acompanhar o dia a dia da sua academia.</p>
        <label class="field">Usuário<input name="login" autocomplete="username" required placeholder="Seu usuário"></label>
        <label class="field">Senha<input name="senha" type="password" autocomplete="current-password" required placeholder="Sua senha"></label>
        <div class="error" role="alert"></div>
        <button class="primary">Entrar na academia ${icon('arrow')}</button>
        <div class="login-footer">${icon('lock')} Acesso interno da equipe</div>
      </form>
    </section>
  </div>`;

  $('#login-form').onsubmit = async e => {
    e.preventDefault();
    const b = e.target.querySelector('button');
    b.disabled = true;
    try {
      state.user = await api('/login', 'POST', Object.fromEntries(new FormData(e.target)));
      await refresh();
    } catch (err) {
      e.target.querySelector('.error').textContent = err.message;
    } finally {
      b.disabled = false;
    }
  };
}

export function studentTable(rows) {
  return table(
    ['Aluno', 'Plano', 'Situação', 'Cadastro', ''],
    rows.map(a => {
      const m = current(a.id_aluno);
      return [
        person(a.nome, a.email || a.telefone),
        esc(m ? name('plano', m.id_plano) : 'Sem plano vigente'),
        m ? badge('Ativo') : badge('Sem matrícula', 'off'),
        date(a.data_cadastro),
        rowButtons('aluno', a, pks),
      ];
    })
  );
}

export function dashboard() {
  const active = state.data.aluno.filter(a => current(a.id_aluno));
  const today = state.data.presenca.filter(p => day(p.data_presenca) === state.data.hoje);
  const sheets = state.data.ficha_treino.filter(f => f.ativa);

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(state.data.hoje + 'T12:00:00');
    d.setDate(d.getDate() - 6 + i);
    const key = d.toISOString().slice(0, 10);
    return {
      label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      count: state.data.presenca.filter(p => day(p.data_presenca) === key).length,
    };
  });
  const max = Math.max(1, ...week.map(w => w.count));

  return (
    heading('Tudo pronto para um novo dia.', 'Acompanhe sua academia e mantenha o ritmo por aqui.', state.section, singular) +
    `<div class="hero"><div><span class="eyebrow">Cada presença é um novo começo</span><h2>Pequenas rotinas.<br>Grandes transformações.</h2><p>Sua equipe cuida das pessoas. O Signy organiza o resto.</p></div><div class="hero-art">${icon(
      'dumbbell'
    )}</div></div><div class="stats">${[
      ['Alunos ativos', active.length, 'users', 'Com matrícula vigente'],
      ['Presenças hoje', today.length, 'check', 'Cada treino conta'],
      ['Fichas ativas', sheets.length, 'dumbbell', 'Treinos em movimento'],
      ['Professores', state.data.professor.length, 'teacher', 'Cuidando de cada evolução'],
    ]
      .map(
        ([label, value, i, hint]) =>
          `<div class="stat"><div class="stat-top">${label}<span class="stat-icon">${icon(i)}</span></div><div class="stat-value">${value
            .toString()
            .padStart(2, '0')}</div><small>${hint}</small></div>`
      )
      .join(
        ''
      )}</div><div class="grid-main"><section class="panel"><div class="panel-head"><div><h2>Movimento da semana</h2><p>Presenças registradas nos últimos 7 dias</p></div>${badge(
      week.reduce((n, w) => n + w.count, 0) + ' presenças'
    )}</div><div class="chart">${week
      .map(
        w =>
          `<div class="bar-wrap"><span>${w.count}</span><div class="bar" style-placeholder="${w.count}" data-height="${Math.max(
            2,
            (w.count / max) * 125
          )}"></div></div>`
      )
      .join('')}</div><div class="chart-labels">${week
      .map(w => `<span>${w.label}</span>`)
      .join('')}</div></section><section class="panel"><div class="panel-head"><div><h2>Chegou para treinar?</h2><p>Registre uma presença em poucos segundos.</p></div>${icon(
      'check'
    )}</div><form class="checkin-box" id="quick-checkin"><label for="quick-student">Selecione o aluno</label><select id="quick-student" name="id_aluno" required><option value="">Buscar aluno com matrícula vigente</option>${active
      .map(a => `<option value="${a.id_aluno}">${esc(a.nome)}</option>`)
      .join(
        ''
      )}</select><button class="primary">${icon('plus')} Registrar presença</button><div class="notice">${icon(
      'lock'
    )}<span>A entrada é liberada apenas para alunos com matrícula vigente.</span></div></form></section></div><section class="panel"><div class="panel-head"><div><h2>Alunos da academia</h2><p>Os cadastros mais recentes, sempre por perto.</p></div><button class="link" data-nav="aluno">Ver todos os alunos ${icon(
      'arrow'
    )}</button></div>${studentTable(state.data.aluno.slice(0, 5))}<div class="table-footer"><span>${
      state.data.aluno.length
    } alunos cadastrados</span><span>Juntos, em movimento.</span></div></section>`
  );
}

export function listBody(rows) {
  if (state.section === 'aluno') return studentTable(rows);
  const config = {
    professor: [
      ['Professor', 'Especialidade', 'Admissão', 'Contato', ''],
      r => [person(r.nome), esc(r.especialidade || '—'), date(r.data_admissao), esc(r.email || r.telefone || '—'), rowButtons(state.section, r, pks)],
    ],
    plano: [
      ['Plano', 'Valor mensal', 'Duração', 'Situação', ''],
      r => [
        `<strong>${esc(r.nome)}</strong>`,
        money(r.valor_mensal),
        r.duracao_meses + ' meses',
        r.ativo ? badge('Ativo') : badge('Inativo', 'off'),
        rowButtons(state.section, r, pks),
      ],
    ],
    matricula: [
      ['Aluno', 'Plano', 'Início', 'Fim', 'Situação', ''],
      r => [person(name('aluno', r.id_aluno)), esc(name('plano', r.id_plano)), date(r.data_inicio), date(r.data_fim), status(r.situacao), rowButtons(state.section, r, pks)],
    ],
    exercicio: [
      ['Exercício', 'Grupo muscular', 'Descrição', ''],
      r => [`<strong>${esc(r.nome)}</strong>`, badge(r.grupo_muscular), esc((r.descricao || '—').slice(0, 70)), rowButtons(state.section, r, pks)],
    ],
    ficha_treino: [
      ['Ficha', 'Aluno', 'Professor', 'Exercícios', 'Situação', ''],
      r => [
        `<strong>${esc(r.descricao)}</strong>`,
        esc(name('aluno', r.id_aluno)),
        esc(name('professor', r.id_professor)),
        state.data.ficha_exercicio.filter(e => e.id_ficha === r.id_ficha).length,
        r.ativa ? badge('Ativa') : badge('Inativa', 'off'),
        rowButtons(state.section, r, pks),
      ],
    ],
    presenca: [
      ['Aluno', 'Data', 'Entrada', ''],
      r => [person(name('aluno', r.id_aluno)), date(r.data_presenca), esc(String(r.hora_entrada).slice(0, 5)), rowButtons(state.section, r, pks)],
    ],
  };
  const [headers, map] = config[state.section];
  return table(headers, rows.map(map));
}

export function listing() {
  const subs = {
    aluno: 'Pessoas, histórias e evolução. Cuide de cada cadastro.',
    professor: 'Conheça a equipe que acompanha cada conquista.',
    plano: 'Organize as opções de acesso à sua academia.',
    matricula: 'Acompanhe a vigência e o histórico de cada aluno.',
    ficha_treino: 'Treinos organizados para uma evolução consistente.',
    exercicio: 'Seu catálogo de movimentos para construir bons treinos.',
    presenca: 'Cada treino conta. Acompanhe a frequência dos alunos.',
  };
  const rows = getFilteredRows();
  let options = [];
  if (['aluno', 'plano', 'ficha_treino'].includes(state.section)) {
    options = [['ativa', 'Ativos'], ['inativa', state.section === 'aluno' ? 'Sem matrícula vigente' : 'Inativos']];
  }
  if (state.section === 'matricula') {
    options = [['ativa', 'Ativas'], ['vencida', 'Vencidas'], ['cancelada', 'Canceladas']];
  }
  if (state.section === 'exercicio') {
    options = [...new Set(state.data.exercicio.map(e => e.grupo_muscular))].map(s => [s, s]);
  }

  return (
    heading(sections[state.section][0], subs[state.section], state.section, singular) +
    `<section class="panel"><div class="toolbar"><input class="search" id="search" aria-label="Buscar registros" placeholder="${
      state.section === 'aluno' ? 'Buscar por nome ou CPF…' : 'Buscar por nome ou descrição…'
    }" value="${esc(state.filter.q)}">${
      options.length
        ? `<select id="status" aria-label="Filtrar situação ou grupo"><option value="">${
            state.section === 'exercicio' ? 'Todos os grupos' : 'Todas as situações'
          }</option>${options.map(([v, t]) => `<option value="${esc(v)}" ${v === state.filter.status ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`
        : ''
    }${
      ['matricula', 'presenca'].includes(state.section)
        ? `<label>De <input type="date" id="from" value="${state.filter.from}"></label><label>Até <input type="date" id="to" value="${state.filter.to}"></label>`
        : ''
    }</div><div id="results">${listBody(rows)}</div><div class="table-footer"><span>${
      rows.length
    } registro(s) encontrado(s)</span><button class="link" data-action="clear">Limpar filtros</button></div></section>`
  );
}

export function navigate(s) {
  state.section = s;
  state.filter = { q: '', status: '', from: '', to: '' };
  render();
}

export function bind() {
  document.querySelectorAll('[data-nav]').forEach(b => (b.onclick = () => navigate(b.dataset.nav)));
  document.querySelectorAll('[data-new]').forEach(b => (b.onclick = () => edit(b.dataset.new, {}, refresh)));
  document.querySelectorAll('[data-edit]').forEach(b => (b.onclick = () => edit(b.dataset.edit, find(b.dataset.edit, b.dataset.id), refresh)));
  document.querySelectorAll('[data-detail]').forEach(b => (b.onclick = () => detail(b.dataset.detail, find(b.dataset.detail, b.dataset.id))));
  document.querySelectorAll('[data-delete]').forEach(
    b =>
      (b.onclick = () =>
        confirmAction(
          'Excluir registro?',
          'Essa ação remove o cadastro. Registros com vínculos serão preservados.',
          () => api('/' + b.dataset.delete + '/' + b.dataset.id, 'DELETE'),
          refresh
        ))
  );
  document.querySelectorAll('[data-cancel]').forEach(
    b =>
      (b.onclick = () =>
        confirmAction(
          'Cancelar matrícula?',
          'A matrícula continuará no histórico e deixará de permitir novas presenças.',
          () => api('/matricula/' + b.dataset.cancel, 'PUT', { situacao: 'cancelada' }),
          refresh
        ))
  );
  document.querySelectorAll('[data-toggle]').forEach(
    b =>
      (b.onclick = () =>
        confirmAction(
          'Alterar disponibilidade do plano?',
          'As matrículas existentes manterão sua vigência.',
          () => api('/plano/' + b.dataset.toggle, 'PUT', { ativo: !find('plano', b.dataset.toggle).ativo }),
          refresh
        ))
  );
  document.querySelectorAll('[data-height]').forEach(b => (b.style.height = b.dataset.height + 'px'));
  document.querySelectorAll('[data-action]').forEach(
    b =>
      (b.onclick = async () => {
        if (b.dataset.action === 'logout') {
          await api('/logout', 'POST');
          login();
        }
        if (b.dataset.action === 'password') passwordModal();
        if (b.dataset.action === 'clear') {
          state.filter = { q: '', status: '', from: '', to: '' };
          render();
        }
      })
  );

  for (const [id, key] of [
    ['search', 'q'],
    ['status', 'status'],
    ['from', 'from'],
    ['to', 'to'],
  ]) {
    if ($('#' + id)) {
      $('#' + id).addEventListener(id === 'search' ? 'input' : 'change', e => {
        const start = e.target.selectionStart;
        state.filter[key] = e.target.value;
        render();
        const el = $('#' + id);
        if (el) {
          el.focus();
          if (id === 'search' && start !== null) el.setSelectionRange(start, start);
        }
      });
    }
  }

  if ($('#quick-checkin')) {
    $('#quick-checkin').onsubmit = async e => {
      e.preventDefault();
      const b = e.target.querySelector('button');
      b.disabled = true;
      try {
        await api('/presenca', 'POST', Object.fromEntries(new FormData(e.target)));
        await refresh();
        toast('Presença registrada. Bom treino!');
      } catch (err) {
        toast(err.message);
      } finally {
        b.disabled = false;
      }
    };
  }
}

export function render() {
  if (!state.user) return;
  const title = sections[state.section][0];
  $('#app').innerHTML = `<div class="layout"><aside class="sidebar"><div class="brand"><span class="brandmark">s</span>signy<small>GESTÃO</small></div><div class="workspace">${icon(
    'dumbbell'
  )}<div><b>Minha academia</b><span>Seu espaço de gestão</span></div></div><div class="eyebrow">Principal</div><nav class="nav">${Object.entries(
    sections
  )
    .map(([k, [label, i]]) => `<button data-nav="${k}" class="${k === state.section ? 'active' : ''}">${icon(i)}${label}</button>`)
    .join(
      ''
    )}</nav><div class="sidebar-bottom"><div class="help"><strong>Uma rotina mais leve.</strong><p>Tudo pronto para cuidar de quem se movimenta com você.</p></div><div class="account"><span class="avatar">${initials(
    state.user.nome
  )}</span><div><b>${esc(state.user.nome)}</b><small>Equipe da academia</small></div><button data-action="password" aria-label="Alterar senha" title="Alterar senha">${icon(
    'settings'
  )}</button></div></div></aside><main class="main"><header class="topbar"><span>Academia <span aria-hidden="true"> / </span> <strong>${title}</strong></span><div class="right"><span class="live">Tudo em movimento</span><span>${new Date(
    state.data.hoje + 'T12:00:00'
  ).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}</span><button data-action="logout" title="Sair" aria-label="Sair">${icon(
    'logout'
  )}</button></div></header><div class="content">${state.section === 'home' ? dashboard() : listing()}<div class="footnote">Signy · Mais tempo para cuidar de pessoas.</div></div></main></div>`;
  bind();
}

export async function start() {
  try {
    state.user = await api('/me');
    await refresh();
  } catch {
    login();
  }
}

start();
