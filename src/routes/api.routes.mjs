import { Router } from 'express';
import { models, expire, clean, insert, syncExercises, fetchAllData } from '../services/gymService.mjs';

export function createApiRouter(db) {
  const router = Router();

  router.get('/data', async (req, res) => {
    const data = await fetchAllData(db);
    res.json(data);
  });

  router.post('/:table', async (req, res) => {
    const table = req.params.table;
    if (!models[table]) return res.sendStatus(404);
    const data = clean(table, req.body);

    const result = await db.transaction(async tx => {
      await expire(tx);

      if (table === 'matricula') {
        const plan = (await tx.query('SELECT * FROM plano WHERE id_plano = $1 AND ativo = TRUE FOR SHARE', [data.id_plano])).rows[0];
        if (!plan) throw Error('Selecione um plano ativo.');
        const dates = (await tx.query(
          "SELECT ($1::date + make_interval(months => $2::integer))::date AS fim, $1::date > CURRENT_DATE AS futura, ($1::date + make_interval(months => $2::integer))::date < CURRENT_DATE AS vencida",
          [data.data_inicio, plan.duracao_meses]
        )).rows[0];
        if (dates.futura) throw Error('A data de início não pode ser futura neste MVP.');
        data.data_fim = dates.fim;
        data.situacao = dates.vencida ? 'vencida' : 'ativa';
      }

      if (table === 'presenca') {
        const current = (await tx.query(
          "SELECT id_matricula FROM matricula WHERE id_aluno = $1 AND situacao = 'ativa' AND data_inicio <= CURRENT_DATE AND data_fim >= CURRENT_DATE FOR SHARE",
          [data.id_aluno]
        )).rows[0];
        if (!current) throw Error('Presença bloqueada: aluno sem matrícula vigente.');
      }

      if (table === 'aluno' && data.data_nascimento && String(data.data_nascimento) > new Date().toISOString().slice(0, 10)) {
        throw Error('A data de nascimento não pode ser futura.');
      }

      const row = await insert(tx, table, data);
      if (table === 'ficha_treino') {
        await syncExercises(tx, row.id_ficha, req.body.exercicios || []);
      }
      return row;
    });

    res.status(201).json(result);
  });

  router.put('/:table/:id', async (req, res) => {
    const table = req.params.table;
    if (!models[table] || table === 'presenca') return res.sendStatus(404);
    const pk = models[table][0];
    const data = clean(table, req.body);

    if (table === 'matricula') {
      if (req.body.situacao !== 'cancelada') throw Error('Uma matrícula só pode ser cancelada.');
      for (const k of Object.keys(data)) delete data[k];
      data.situacao = 'cancelada';
    }

    if (table === 'aluno' && data.data_nascimento && String(data.data_nascimento) > new Date().toISOString().slice(0, 10)) {
      throw Error('A data de nascimento não pode ser futura.');
    }

    const result = await db.transaction(async tx => {
      await expire(tx);
      if (table === 'matricula') {
        const old = (await tx.query('SELECT situacao FROM matricula WHERE id_matricula = $1', [req.params.id])).rows[0];
        if (!old || old.situacao !== 'ativa') throw Error('Somente matrículas ativas podem ser canceladas.');
      }
      const keys = Object.keys(data);
      if (!keys.length) throw Error('Nenhuma alteração informada.');
      const row = (await tx.query(
        `UPDATE ${table} SET ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')} WHERE ${pk} = $${keys.length + 1} RETURNING *`,
        [...Object.values(data), req.params.id]
      )).rows[0];
      if (!row) throw Error('Registro não encontrado.');
      if (table === 'ficha_treino') {
        await syncExercises(tx, row.id_ficha, req.body.exercicios || []);
      }
      return row;
    });

    res.json(result);
  });

  router.delete('/:table/:id', async (req, res) => {
    const table = req.params.table;
    if (!['aluno', 'professor', 'exercicio', 'ficha_treino'].includes(table)) {
      return res.status(400).json({ error: 'Este registro deve ser mantido no histórico.' });
    }
    const pk = models[table][0];
    const rows = (await db.query(`DELETE FROM ${table} WHERE ${pk} = $1 RETURNING *`, [req.params.id])).rows;
    if (!rows.length) return res.status(404).json({ error: 'Registro não encontrado.' });
    res.json({ ok: true });
  });

  return router;
}
