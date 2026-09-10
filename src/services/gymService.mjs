export const models = {
  aluno: ['id_aluno', 'nome', 'cpf', 'data_nascimento', 'sexo', 'telefone', 'email'],
  professor: ['id_professor', 'nome', 'cpf', 'telefone', 'email', 'especialidade', 'data_admissao'],
  plano: ['id_plano', 'nome', 'descricao', 'valor_mensal', 'duracao_meses', 'ativo'],
  exercicio: ['id_exercicio', 'nome', 'grupo_muscular', 'descricao'],
  ficha_treino: ['id_ficha', 'id_aluno', 'id_professor', 'descricao', 'ativa'],
  matricula: ['id_matricula', 'id_aluno', 'id_plano', 'data_inicio'],
  presenca: ['id_presenca', 'id_aluno'],
};

export async function expire(tx) {
  await tx.query("UPDATE matricula SET situacao='vencida' WHERE situacao='ativa' AND data_fim < CURRENT_DATE");
}

export function clean(table, body) {
  const data = {};
  for (const key of models[table].slice(1)) {
    if (body[key] !== undefined) {
      data[key] = typeof body[key] === 'string' ? body[key].trim() || null : body[key];
    }
  }
  if ('cpf' in data) {
    data.cpf = String(data.cpf || '').replace(/\D/g, '');
  }
  if (data.email) {
    data.email = data.email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw Error('Informe um e-mail válido.');
    }
  }
  for (const key of ['nome', 'descricao', 'grupo_muscular']) {
    if (key in data && data[key] === null && !(key === 'descricao' && ['plano', 'exercicio'].includes(table))) {
      throw Error('Preencha os campos obrigatórios.');
    }
  }
  return data;
}

export async function insert(tx, table, data) {
  const keys = Object.keys(data);
  return (await tx.query(
    `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING *`,
    Object.values(data)
  )).rows[0];
}

export async function syncExercises(tx, idFicha, list) {
  if (!Array.isArray(list) || list.length > 100) {
    throw Error('Informe uma lista válida de exercícios.');
  }
  await tx.query('DELETE FROM ficha_exercicio WHERE id_ficha = $1', [idFicha]);
  for (const item of list) {
    await insert(tx, 'ficha_exercicio', {
      id_ficha: idFicha,
      id_exercicio: item.id_exercicio,
      ordem: item.ordem,
      series: item.series,
      repeticoes: item.repeticoes,
      carga_sugerida: item.carga_sugerida === '' ? null : item.carga_sugerida,
      observacao: item.observacao || null,
    });
  }
}

export async function fetchAllData(db) {
  await expire(db);
  const data = {};
  for (const [table, [pk]] of Object.entries(models)) {
    data[table] = (await db.query(`SELECT * FROM ${table} ORDER BY ${pk} DESC`)).rows;
  }
  data.ficha_exercicio = (await db.query('SELECT * FROM ficha_exercicio ORDER BY ordem, id_ficha_exercicio')).rows;
  data.hoje = (await db.query("SELECT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS hoje")).rows[0].hoje;
  return data;
}
