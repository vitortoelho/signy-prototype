import { readFileSync } from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { config } from '../config/env.mjs';

export async function initDatabase(db, projectRoot) {
  const schemaPath = path.join(projectRoot, 'schema.sql');
  const schemaSql = readFileSync(schemaPath, 'utf8');
  await db.exec(schemaSql);

  const users = (await db.query('SELECT id FROM usuario LIMIT 1')).rows;
  if (!users.length) {
    if (config.isProduction && (!config.adminPassword || Buffer.byteLength(config.adminPassword) < 12 || Buffer.byteLength(config.adminPassword) > 72)) {
      throw Error('Configure ADMIN_PASSWORD com 12 a 72 bytes antes do primeiro deploy.');
    }
    const password = config.adminPassword || randomBytes(12).toString('base64url');
    const hash = await bcrypt.hash(password, 12);
    await db.query('INSERT INTO usuario(nome, login, senha_hash) VALUES($1, $2, $3)', ['Administrador', 'admin', hash]);
    if (!config.isProduction) {
      console.log(`Primeiro acesso — usuário: admin | senha: ${password}`);
    }
  }
}
