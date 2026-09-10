export const paths = {
  home: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8',
  teacher: 'M12 3 2 8l10 5 10-5-10-5 M5 10v6c4 4 10 4 14 0v-6 M22 8v8',
  plan: 'M3 5h18v14H3z M3 10h18 M7 15h3',
  enroll: 'M7 3h10v4H7z M7 5H4v16h16V5h-3 M8 12h8 M8 16h5',
  dumbbell: 'M6 6v12 M3 8v8 M18 6v12 M21 8v8 M6 12h12',
  check: 'M20 6 9 17l-5-5',
  calendar: 'M3 5h18v16H3z M7 3v4 M17 3v4 M3 11h18 M8 15h2 M14 15h2',
  plus: 'M12 5v14 M5 12h14',
  arrow: 'M5 12h14 M14 7l5 5-5 5',
  logout: 'M9 4H4v16h5 M9 12h12 M17 8l4 4-4 4',
  lock: 'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3',
};

export const icon = n => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[n] || paths.home}"/></svg>`;
