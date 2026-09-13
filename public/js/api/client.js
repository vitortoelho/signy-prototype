export const $ = s => document.querySelector(s);

export function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 4500);
}

let onUnauthorizedCallback = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorizedCallback = fn;
}

export async function api(url, method = 'GET', body) {
  const r = await fetch('/api' + url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await r.json();
  if (!r.ok) {
    if (r.status === 401 && url !== '/login' && onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
    throw Error(result.error || 'Não foi possível concluir.');
  }
  return result;
}
