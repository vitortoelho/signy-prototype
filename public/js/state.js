import { day } from './ui/templates.js';

export const sections = {
  home: ['Visão geral', 'home'],
  aluno: ['Alunos', 'users'],
  professor: ['Professores', 'teacher'],
  plano: ['Planos', 'plan'],
  matricula: ['Matrículas', 'enroll'],
  ficha_treino: ['Fichas de treino', 'dumbbell'],
  exercicio: ['Exercícios', 'dumbbell'],
  presenca: ['Presenças', 'calendar'],
};

export const singular = {
  aluno: 'aluno',
  professor: 'professor',
  plano: 'plano',
  matricula: 'matrícula',
  ficha_treino: 'ficha de treino',
  exercicio: 'exercício',
  presenca: 'presença',
};

export const pks = {
  aluno: 'id_aluno',
  professor: 'id_professor',
  plano: 'id_plano',
  matricula: 'id_matricula',
  ficha_treino: 'id_ficha',
  exercicio: 'id_exercicio',
  presenca: 'id_presenca',
};

export const state = {
  data: {},
  user: null,
  section: 'home',
  filter: { q: '', status: '', from: '', to: '' },
};

export const find = (t, id) => state.data[t]?.find(r => r[pks[t]] === Number(id));
export const name = (t, id) => find(t, id)?.nome || '—';
export const current = id =>
  state.data.matricula?.find(
    m => m.id_aluno === id && m.situacao === 'ativa' && day(m.data_inicio) <= state.data.hoje && day(m.data_fim) >= state.data.hoje
  );
export const opts = t => state.data[t]?.map(r => [r[pks[t]], r.nome]) || [];

export function getFilteredRows() {
  return state.data[state.section].filter(r => {
    const search = [
      r.nome,
      r.cpf,
      r.descricao,
      r.especialidade,
      r.grupo_muscular,
      r.id_aluno ? name('aluno', r.id_aluno) : '',
    ].join(' ').toLocaleLowerCase('pt-BR');

    if (state.filter.q && !search.includes(state.filter.q.toLocaleLowerCase('pt-BR'))) return false;

    const currentStatus =
      state.section === 'aluno'
        ? current(r.id_aluno)
          ? 'ativa'
          : 'inativa'
        : state.section === 'ficha_treino'
        ? r.ativa
          ? 'ativa'
          : 'inativa'
        : state.section === 'plano'
        ? r.ativo
          ? 'ativa'
          : 'inativa'
        : state.section === 'exercicio'
        ? r.grupo_muscular
        : r.situacao;

    if (state.filter.status && currentStatus !== state.filter.status) return false;

    const d = day(r.data_presenca || r.data_inicio);
    return (!state.filter.from || d >= state.filter.from) && (!state.filter.to || d <= state.filter.to);
  });
}
