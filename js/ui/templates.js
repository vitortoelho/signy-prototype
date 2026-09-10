import { icon } from './icons.js';

export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const date = v => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—');
export const money = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const day = v => String(v || '').slice(0, 10);

export const initials = n =>
  String(n)
    .split(' ')
    .filter(Boolean)
    .map(x => x[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const person = (n, sub = '') =>
  `<div class="person"><span class="avatar">${esc(initials(n))}</span><div><strong>${esc(n)}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</div></div>`;

export const badge = (text, type = '') => `<span class="badge ${type}">${esc(text)}</span>`;

export const status = s => badge({ ativa: 'Ativa', vencida: 'Vencida', cancelada: 'Cancelada' }[s] || s, s === 'vencida' ? 'warn' : s === 'cancelada' ? 'off' : '');

export function table(headers, rows) {
  return `<div class="table-scroll"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${
    rows.length
      ? rows.map(cells => `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${headers.length}"><div class="empty"><strong>Nenhum registro por aqui.</strong>Cadastre o primeiro item ou ajuste os filtros para começar.</div></td></tr>`
  }</tbody></table></div>`;
}

export function heading(title, sub, section, singular) {
  return `<div class="page-heading"><div><span class="eyebrow">Sua academia, em sintonia</span><h1>${title}</h1><p class="subtitle">${sub}</p></div><div class="actions">${
    section === 'home'
      ? '<button data-nav="presenca">' + icon('check') + ' Registrar presença</button><button class="primary" data-new="aluno">' + icon('plus') + ' Novo aluno</button>'
      : `<button class="primary" data-new="${section}">${icon('plus')} ${
          section === 'presenca' ? 'Registrar presença' : (section === 'ficha_treino' || section === 'matricula' ? 'Nova ' : 'Novo ') + singular[section]
        }</button>`
  }</div></div>`;
}

export function rowButtons(t, r, pks) {
  const id = r[pks[t]];
  return `<div class="row-actions"><button data-detail="${t}" data-id="${id}">Ver</button>${
    t === 'presenca'
      ? ''
      : t === 'matricula'
      ? r.situacao === 'ativa'
        ? `<button class="danger" data-cancel="${id}">Cancelar</button>`
        : ''
      : `<button data-edit="${t}" data-id="${id}">Editar</button>${
          t === 'plano'
            ? `<button data-toggle="${id}">${r.ativo ? 'Desativar' : 'Ativar'}</button>`
            : `<button class="danger" data-delete="${t}" data-id="${id}">Excluir</button>`
        }`
  }</div>`;
}
