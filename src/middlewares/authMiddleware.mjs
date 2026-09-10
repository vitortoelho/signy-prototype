import { createHash } from 'node:crypto';

export function getSessionToken(req) {
  const match = (req.headers.cookie || '').match(/(?:^|; )signy=([^;]+)/);
  return match ? createHash('sha256').update(match[1]).digest('hex') : '';
}

export function createAuthMiddleware(db) {
  return async function authMiddleware(req, res, next) {
    try {
      const token = getSessionToken(req);
      const rows = (await db.query(
        'SELECT u.id, u.nome FROM sessao s JOIN usuario u ON u.id = s.id_usuario WHERE token = $1 AND expira > NOW()',
        [token]
      )).rows;
      const user = rows[0];
      if (!user) {
        return res.status(401).json({ error: 'Entre na sua conta para continuar.' });
      }
      req.user = user;
      next();
    } catch (e) {
      next(e);
    }
  };
}
