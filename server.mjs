import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './src/config/env.mjs';
import { createApp, registerErrorHandler } from './src/app.mjs';
import { connectDatabase } from './src/database/connection.mjs';
import { initDatabase } from './src/database/init.mjs';
import { createAuthMiddleware } from './src/middlewares/authMiddleware.mjs';
import { createAuthRouter, createUserRouter } from './src/routes/auth.routes.mjs';
import { createApiRouter } from './src/routes/api.routes.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));

// Conecta e inicializa persistência
export const db = await connectDatabase(root);
await initDatabase(db, root);

// Cria e configura aplicação Express
export const app = createApp();

// Endpoint de saúde
app.get('/healthz', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

// 1. Rota pública de login
app.use('/api', createAuthRouter(db));

// 2. Middleware de autorização para rotas de negócio
const authMiddleware = createAuthMiddleware(db);
app.use('/api', authMiddleware);

// 3. Rotas autenticadas de usuário (me, logout, password)
app.use('/api', createUserRouter(db));

// 4. Rotas de dados e CRUD de domínio
const apiRouter = createApiRouter(db);
app.use('/api', apiRouter);

// Tratamento de erros e 404
registerErrorHandler(app);

// Inicia servidor HTTP em ambiente real
if (config.nodeEnv !== 'test') {
  const server = app.listen(config.port, config.host, () => {
    console.log(`Signy disponível na porta ${config.port}`);
  });

  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 25000);
    deadline.unref();
    server.close(async () => {
      try {
        await db.close();
        process.exit(0);
      } catch {
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
