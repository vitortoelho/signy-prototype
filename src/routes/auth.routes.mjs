import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'node:crypto';
import { getSessionToken } from '../middlewares/authMiddleware.mjs';

export function createAuthRouter(db) {
  const router = Router();
  const attempts = new Map();

  router.post('/login', async (req, res) => {
    const key = req.ip;
    const now = Date.now();
    const attempt = attempts.get(key);
    if (attempt && attempt.until > now && attempt.count >= 10) {
      return res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos.' });
    }

    const rows = (await db.query('SELECT * FROM usuario WHERE login = $1', [String(req.body.login || '')])).rows;
    const user = rows[0];

    if (!user || !await bcrypt.compare(String(req.body.senha || ''), user.senha_hash)) {
      const a = attempt && attempt.until > now ? attempt : { count: 0, until: now + 900000 };
      a.count++;
      attempts.set(key, a);
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }

    attempts.delete(key);
    const token = randomBytes(32).toString('hex');
    await db.query("DELETE FROM sessao WHERE expira < NOW()");
    await db.query("INSERT INTO sessao VALUES($1, $2, NOW() + INTERVAL '8 hours')", [
      createHash('sha256').update(token).digest('hex'),
      user.id,
    ]);

    res.set('Set-Cookie', `signy=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${req.secure ? '; Secure' : ''}`)
       .json({ nome: user.nome });
  });

  return router;
}

export function createUserRouter(db) {
  const router = Router();

  router.get('/me', (req, res) => res.json(req.user));

  router.post('/logout', async (req, res) => {
    await db.query('DELETE FROM sessao WHERE token = $1', [getSessionToken(req)]);
    res.set('Set-Cookie', 'signy=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0').json({ ok: true });
  });

  router.post('/password', async (req, res) => {
    const rows = (await db.query('SELECT * FROM usuario WHERE id = $1', [req.user.id])).rows;
    const user = rows[0];
    if (!await bcrypt.compare(String(req.body.atual || ''), user.senha_hash)) {
      throw Error('Senha atual incorreta.');
    }
    if (typeof req.body.nova !== 'string' || req.body.nova.length < 10 || req.body.nova.length > 72) {
      throw Error('Use uma senha de 10 a 72 caracteres.');
    }
    const newHash = await bcrypt.hash(req.body.nova, 12);
    await db.query('UPDATE usuario SET senha_hash = $1 WHERE id = $2', [newHash, user.id]);
    await db.query('DELETE FROM sessao WHERE id_usuario = $1 AND token <> $2', [user.id, getSessionToken(req)]);
    res.json({ ok: true });
  });

  return router;
}
