import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config/env.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(root, '..');

export function createApp() {
  const app = express();

  if (config.trustProxyHops) {
    app.set('trust proxy', config.trustProxyHops);
  }

  app.disable('x-powered-by');

  // Cabeçalhos de segurança e política de cache
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    });
    if (req.path.startsWith('/api')) {
      res.set('Cache-Control', 'no-store');
    }
    next();
  });

  // Parser JSON para requisições
  app.use(express.json({ limit: '100kb' }));

  // Validação de origem em métodos mutáveis
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin && req.headers.origin !== `${req.protocol}://${req.headers.host}`) {
      return res.status(403).json({ error: 'Origem da requisição não permitida.' });
    }
    next();
  });

  // Arquivos estáticos da interface pública
  app.use(express.static(path.join(projectRoot, 'public')));

  return app;
}

export function registerErrorHandler(app) {
  // 404 para rotas de API não tratadas
  app.use('/api', (req, res) => res.status(404).json({ error: 'Operação não encontrada.' }));

  // Tratamento centralizado de exceções e erros de banco
  app.use((err, req, res, next) => {
    let message = err.message;
    if (err.code === '23505') {
      message = err.constraint?.includes('cpf')
        ? 'CPF já cadastrado.'
        : err.constraint?.includes('email')
        ? 'E-mail já cadastrado.'
        : err.constraint?.includes('matricula')
        ? 'Este aluno já possui uma matrícula vigente.'
        : err.constraint?.includes('presenca')
        ? 'A presença deste aluno já foi registrada hoje.'
        : 'Não é possível repetir o mesmo exercício na ficha.';
    } else if (err.code === '23503') {
      message = 'Operação bloqueada: existem registros vinculados ou uma referência não existe.';
    } else if (['23502', '23514', '22001', '22007', '22008', '22P02', '22003'].includes(err.code)) {
      message = 'Confira os campos obrigatórios, datas, CPF (11 dígitos) e valores positivos.';
    } else if (err.code) {
      console.error(err);
      message = 'Não foi possível concluir a operação.';
    }
    res.status(400).json({ error: message });
  });
}
