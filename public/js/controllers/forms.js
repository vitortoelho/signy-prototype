import { $, api, toast } from '../api/client.js';
import { state, pks, singular, opts, name, current } from '../state.js';
import { esc, date, day, money, badge, status, person, table, icon } from '../ui/templates.js';

export const field = (label, key, type = 'text', value = '', required = false, extra = '') =>
  `<label class="field">${label}${required ? ' *' : ''}<input name="${key}" type="${type}" value="${esc(value)}" ${required ? 'required' : ''} ${extra}></label>`;

export const selectField = (label, key, options, value = '', required = false) =>
  `<label class="field">${label}${required ? ' *' : ''}<select name="${key}" ${required ? 'required' : ''}><option value="">Selecione</option>${options
    .map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`)
    .join('')}</select></label>`;

export function modal(title, body, footer = '') {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-header"><h2>${title}</h2><button type="button" id="close-modal" aria-label="Fechar">×</button></div>${body}${footer}`;
  if (!m.open) m.showModal();
  $('#close-modal').onclick = () => m.close();
  m.querySelectorAll('[data-close]').forEach(b => (b.onclick = () => m.close()));
}

export function confirmAction(title, description, action, onDone) {
  modal(
    title,
    `<div class="modal-body"><p>${description}</p><div class="error" role="alert"></div></div>`,
    `<div class="modal-footer"><button data-close>Voltar</button><button class="primary" id="confirm">Confirmar</button></div>`
  );
  $('#confirm').onclick = async e => {
    e.target.disabled = true;
    try {
      await action();
      $('#modal').close();
      if (onDone) await onDone();
      toast('Alteração realizada.');
    } catch (err) {
      $('#modal .error').textContent = err.message;
    } finally {
      e.target.disabled = false;
    }
  };
}

export function addExercise(r) {
  const el = document.createElement('div');
  el.className = 'exercise-row';
  el.innerHTML = `<div class="exercise-grid"><label>Exercício<select data-key="id_exercicio" required><option value="">Selecione</option>${opts('exercicio')
    .map(([v, l]) => `<option value="${v}" ${v === Number(r.id_exercicio) ? 'selected' : ''}>${esc(l)}</option>`)
    .join('')}</select></label>${[
    ['Ordem', 'ordem', 1],
    ['Séries', 'series', 1],
    ['Repetições', 'repeticoes', 1],
    ['Carga (kg)', 'carga_sugerida', 0],
  ]
    .map(
      ([label, key, min]) =>
        `<label>${label}<input data-key="${key}" type="number" min="${min}" step="${key === 'carga_sugerida' ? '.01' : '1'}" value="${esc(
          r[key]
        )}" ${key === 'carga_sugerida' ? '' : 'required'}></label>`
    )
    .join('')}<button type="button" aria-label="Remover exercício">×</button></div><input data-key="observacao" aria-label="Observações do exercício" placeholder="Observações: descanso, execução…" value="${esc(
    r.observacao
  )}">`;
  el.querySelector('button').onclick = () => el.remove();
  $('#exercise-rows').append(el);
}

export function edit(t, r = {}, onDone) {
  const id = r[pks[t]];
  let fields = '';
  if (['aluno', 'professor'].includes(t)) {
    fields =
      field('Nome completo', 'nome', 'text', r.nome, true, 'maxlength="150"') +
      field('CPF', 'cpf', 'text', r.cpf, true, 'inputmode="numeric" maxlength="14" placeholder="000.000.000-00"') +
      field('Telefone', 'telefone', 'tel', r.telefone, false, 'maxlength="15"') +
      field('E-mail', 'email', 'email', r.email, false, 'maxlength="150"');
    fields +=
      t === 'aluno'
        ? field('Data de nascimento', 'data_nascimento', 'date', day(r.data_nascimento), true, `max="${state.data.hoje}"`) +
          selectField('Sexo (opcional)', 'sexo', [['F', 'Feminino'], ['M', 'Masculino']], r.sexo)
        : field('Especialidade', 'especialidade', 'text', r.especialidade, false, 'maxlength="100"') +
          field('Data de admissão', 'data_admissao', 'date', day(r.data_admissao) || state.data.hoje, true);
  }
  if (t === 'plano') {
    fields =
      field('Nome do plano', 'nome', 'text', r.nome, true, 'maxlength="100"') +
      field('Valor mensal (R$)', 'valor_mensal', 'number', r.valor_mensal, true, 'min="0.01" max="999999.99" step="0.01"') +
      field('Duração em meses', 'duracao_meses', 'number', r.duracao_meses || 1, true, 'min="1" max="120" step="1"') +
      selectField('Disponibilidade', 'ativo', [[true, 'Ativo'], [false, 'Inativo']], r.ativo ?? true, true) +
      field('Descrição', 'descricao', 'text', r.descricao);
  }
  if (t === 'matricula') {
    fields =
      selectField('Aluno', 'id_aluno', opts('aluno'), r.id_aluno, true) +
      selectField(
        'Plano ativo',
        'id_plano',
        state.data.plano.filter(p => p.ativo).map(p => [p.id_plano, p.nome + ' · ' + money(p.valor_mensal) + '/mês']),
        r.id_plano,
        true
      ) +
      field('Início da vigência', 'data_inicio', 'date', state.data.hoje, true, `max="${state.data.hoje}"`) +
      `<div class="notice">A data final é calculada a partir da duração do plano. Matrículas anteriores permanecem no histórico.</div>`;
  }
  if (t === 'presenca') {
    fields =
      selectField('Aluno', 'id_aluno', opts('aluno'), r.id_aluno, true) +
      `<div class="notice">Data e horário são registrados automaticamente. Apenas uma entrada por aluno a cada dia, com matrícula vigente.</div>`;
  }
  if (t === 'exercicio') {
    fields =
      field('Nome do exercício', 'nome', 'text', r.nome, true, 'maxlength="150"') +
      field('Grupo muscular', 'grupo_muscular', 'text', r.grupo_muscular, true, 'maxlength="50" placeholder="Ex.: Peitoral"') +
      field('Descrição / execução', 'descricao', 'text', r.descricao);
  }
  if (t === 'ficha_treino') {
    fields =
      field('Descrição da ficha', 'descricao', 'text', r.descricao, true, 'maxlength="100" placeholder="Ex.: Treino A — Superior"') +
      selectField('Situação', 'ativa', [[true, 'Ativa'], [false, 'Inativa']], r.ativa ?? true, true) +
      selectField('Aluno', 'id_aluno', opts('aluno'), r.id_aluno, true) +
      selectField('Professor responsável', 'id_professor', opts('professor'), r.id_professor, true) +
      `<div class="wide"><h3>Exercícios da ficha</h3><p class="subtitle">Defina a ordem e os parâmetros de cada movimento.</p><div id="exercise-rows"></div><button type="button" id="add-exercise">${icon(
        'plus'
      )} Adicionar exercício</button></div>`;
  }

  modal(
    `${id ? 'Editar' : t === 'presenca' ? 'Registrar' : 'Cadastrar'} ${singular[t]}`,
    `<form id="edit-form"><div class="modal-body"><div class="form-grid">${fields}</div><div class="error" role="alert"></div></div><div class="modal-footer"><button type="button" data-close>Voltar</button><button class="primary" type="submit">${
      id ? 'Salvar alterações' : t === 'presenca' ? 'Registrar presença' : 'Salvar cadastro'
    }</button></div></form>`
  );

  if (t === 'ficha_treino') {
    state.data.ficha_exercicio.filter(e => e.id_ficha === id).forEach(addExercise);
    $('#add-exercise').onclick = () => addExercise({ ordem: $('#exercise-rows').children.length + 1, series: 3, repeticoes: 12 });
  }

  $('#edit-form').onsubmit = async e => {
    e.preventDefault();
    const b = e.target.querySelector('[type=submit]');
    b.disabled = true;
    const body = Object.fromEntries(new FormData(e.target));
    for (const key of ['ativo', 'ativa']) {
      if (key in body) body[key] = body[key] === 'true';
    }
    if (t === 'ficha_treino') {
      body.exercicios = [...document.querySelectorAll('.exercise-row')].map(row =>
        Object.fromEntries([...row.querySelectorAll('[data-key]')].map(input => [input.dataset.key, input.value]))
      );
    }
    try {
      await api('/' + t + (id ? '/' + id : ''), id ? 'PUT' : 'POST', body);
      $('#modal').close();
      if (onDone) await onDone();
      toast('Registro salvo com sucesso.');
    } catch (err) {
      e.target.querySelector('.error').textContent = err.message;
    } finally {
      b.disabled = false;
    }
  };
}

export function detail(t, r) {
  const labels = {
    nome: 'Nome',
    cpf: 'CPF',
    email: 'E-mail',
    telefone: 'Telefone',
    data_nascimento: 'Nascimento',
    sexo: 'Sexo',
    data_admissao: 'Admissão',
    especialidade: 'Especialidade',
    descricao: 'Descrição',
    grupo_muscular: 'Grupo muscular',
    valor_mensal: 'Valor mensal',
    duracao_meses: 'Duração (meses)',
    ativo: 'Ativo',
    ativa: 'Ativa',
    data_inicio: 'Início',
    data_fim: 'Fim',
    situacao: 'Situação',
    data_presenca: 'Data da presença',
    hora_entrada: 'Entrada',
    criado_em: 'Criado em',
    atualizado_em: 'Última alteração',
  };

  let body = Object.entries(r)
    .filter(([k]) => labels[k])
    .map(
      ([k, v]) =>
        `<div class="detail-line"><span>${labels[k]}</span><strong>${esc(
          k.startsWith('data_')
            ? date(v)
            : k.endsWith('_em')
            ? new Date(v).toLocaleString('pt-BR')
            : typeof v === 'boolean'
            ? v
              ? 'Sim'
              : 'Não'
            : v || '—'
        )}</strong></div>`
    )
    .join('');

  if (t === 'ficha_treino') {
    body =
      `<p>Aluno: <b>${esc(name('aluno', r.id_aluno))}</b> · Professor: <b>${esc(name('professor', r.id_professor))}</b></p>` +
      body +
      `<h3>Exercícios</h3>` +
      table(
        ['Ordem', 'Exercício', 'Séries × rep.', 'Carga', 'Observações'],
        state.data.ficha_exercicio
          .filter(e => e.id_ficha === r.id_ficha)
          .map(e => [
            e.ordem,
            esc(name('exercicio', e.id_exercicio)),
            e.series + ' × ' + e.repeticoes,
            e.carga_sugerida === null ? '—' : esc(e.carga_sugerida) + ' kg',
            esc(e.observacao || '—'),
          ])
      );
  }

  if (t === 'aluno') {
    body +=
      '<h3>Histórico de matrículas</h3>' +
      table(
        ['Plano', 'Início', 'Fim', 'Situação'],
        state.data.matricula
          .filter(m => m.id_aluno === r.id_aluno)
          .map(m => [esc(name('plano', m.id_plano)), date(m.data_inicio), date(m.data_fim), status(m.situacao)])
      ) +
      '<h3>Fichas de treino</h3>' +
      table(
        ['Ficha', 'Professor', 'Situação'],
        state.data.ficha_treino
          .filter(f => f.id_aluno === r.id_aluno)
          .map(f => [esc(f.descricao), esc(name('professor', f.id_professor)), f.ativa ? badge('Ativa') : badge('Inativa', 'off')])
      ) +
      '<h3>Histórico de presença</h3>' +
      table(
        ['Data', 'Entrada'],
        state.data.presenca
          .filter(p => p.id_aluno === r.id_aluno)
          .map(p => [date(p.data_presenca), esc(String(p.hora_entrada).slice(0, 5))])
      );
  }

  modal('Detalhes do cadastro', `<div class="modal-body">${body}</div>`, `<div class="modal-footer"><button data-close>Fechar</button></div>`);
}

export function passwordModal() {
  modal(
    'Alterar senha',
    `<form id="password-form"><div class="modal-body">${field(
      'Senha atual',
      'atual',
      'password',
      '',
      true,
      'autocomplete="current-password"'
    )}${field(
      'Nova senha',
      'nova',
      'password',
      '',
      true,
      'minlength="10" maxlength="72" autocomplete="new-password"'
    )}<div class="error" role="alert"></div></div><div class="modal-footer"><button class="primary">Salvar senha</button></div></form>`
  );
  $('#password-form').onsubmit = async e => {
    e.preventDefault();
    try {
      await api('/password', 'POST', Object.fromEntries(new FormData(e.target)));
      $('#modal').close();
      toast('Senha alterada.');
    } catch (err) {
      $('#modal .error').textContent = err.message;
    }
  };
}
