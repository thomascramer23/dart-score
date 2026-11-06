import { newGame, playTurn, undoTurn, checkoutRoute } from './game.js';

const $ = id => document.getElementById(id);
const storageKey = 'double-top-game-v1';
let game = newGame();
let mode = 'keypad';
let darts = [];
let notice = '';
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved && [301, 501].includes(saved.start) && ['straight', 'double'].includes(saved.rule) && Array.isArray(saved.names) && [2, 3].includes(saved.names.length) && saved.names.every(n => typeof n === 'string' && n.length <= 24) && Array.isArray(saved.history)) {
    let restored = newGame(saved.start, saved.rule, saved.names, saved.starter ?? 0);
    for (const turn of saved.history) restored = playTurn(restored, turn.total, turn.lastDouble);
    game = restored;
  }
} catch { notice = 'Saved game unavailable. A fresh game is ready.'; }

function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(game)); }
  catch { $('save-message').textContent = 'Storage unavailable — keep this tab open to keep playing.'; document.querySelector('.local-note').textContent = 'Playing without saving'; }
}
function textElement(tag, text, className) {
  const el = document.createElement(tag);
  el.textContent = text;
  if (className) el.className = className;
  return el;
}
function render() {
  $('scoreboard').classList.toggle('three-players', game.names.length === 3);
  $('game-badge').replaceChildren(document.createTextNode(game.start + ' '), textElement('span', game.rule === 'double' ? 'DOUBLE OUT' : 'STRAIGHT OUT'));
  $('scoreboard').replaceChildren(...game.names.map((name, index) => {
    const turns = game.history.filter(t => t.player === index);
    const average = turns.length ? (turns.reduce((s, t) => s + (t.bust ? 0 : t.total), 0) / turns.length).toFixed(1) : '—';
    const card = document.createElement('article');
    card.className = 'player' + (game.active === index ? ' active' : '') + (game.winner === index ? ' won' : '');
    if (game.active === index) card.setAttribute('aria-current', 'true');
    card.setAttribute('aria-label', `${name}: ${game.scores[index]} remaining${game.winner === index ? ', winner' : game.active === index ? ', your turn' : ''}`);
    const top = textElement('div', '', 'player-top');
    top.append(textElement('span', String(index + 1).padStart(2, '0'), 'avatar'), textElement('span', name));
    if (game.active === index) top.append(textElement('span', game.winner === index ? 'WINNER' : 'YOUR TURN', 'turn-tag'));
    const bottom = textElement('div', '', 'player-bottom');
    for (const [label, value] of [['Turn avg.', average], ['Last turn', turns.length ? (turns.at(-1).bust ? 'Bust' : turns.at(-1).total) : '—']]) {
      const stat = textElement('span', label); stat.append(textElement('b', value)); bottom.append(stat);
    }
    card.append(top, textElement('div', game.scores[index], 'remaining'), textElement('div', 'POINTS REMAINING', 'remaining-label'), bottom);
    return card;
  }));
  $('turn-title').textContent = game.winner === null ? 'Make your mark' : 'That’s game!';
  const currentName = game.names[game.active];
  const turnText = textElement('div', '', 'turn-banner-text');
  turnText.append(textElement('span', game.winner === null ? 'UP TO THROW' : 'GAME COMPLETE', 'turn-banner-label'), textElement('strong', game.winner === null ? `${currentName}’s turn` : `${currentName} wins!`));
  $('turn-banner').replaceChildren(textElement('span', String(game.active + 1).padStart(2, '0'), 'turn-banner-player'), turnText, textElement('span', game.winner === null ? `${game.scores[game.active]} left` : 'Winner', 'turn-banner-score'));
  $('submit-label').textContent = game.winner === null ? `Submit ${currentName}’s score` : 'Game complete';
  $('rule-help').textContent = game.rule === 'double' ? 'Reach exactly zero with your final dart on a double (or inner bull). Leaving 1 or missing the double is a bust.' : 'Get to exactly zero to win. Go below zero and your turn is a bust.';
  $('turn-count').textContent = `${game.history.length} TURN${game.history.length === 1 ? '' : 'S'}`;
  $('history').replaceChildren();
  if (!game.history.length) {
    const empty = textElement('div', '', 'empty-history');
    empty.append(textElement('div', '◎', 'target'), textElement('h3', 'Every great game starts at zero.'), textElement('p', 'Your turns will appear here. Make the first one count.'));
    $('history').append(empty);
  } else {
    const list = textElement('div', '', 'history-list');
    [...game.history].reverse().forEach((turn, i) => {
      const row = textElement('div', '', 'history-row');
      const name = textElement('div', game.names[turn.player], 'history-name');
      name.append(textElement('small', `${turn.before} → ${turn.after} remaining`));
      row.append(textElement('span', String(game.history.length - i).padStart(2, '0'), 'history-index'), name, textElement('span', turn.bust ? 'BUST' : turn.total, 'history-score' + (turn.bust ? ' bust' : '')));
      list.append(row);
    });
    $('history').append(list);
  }
  $('undo').disabled = !game.history.length;
  $('submit-score').disabled = game.winner !== null;
  $('score').disabled = game.winner !== null;
  $('keypad').querySelectorAll('button').forEach(b => b.disabled = game.winner !== null);
  document.querySelectorAll('[data-total]').forEach(b => b.disabled = game.winner !== null);
  updateEntry();
  $('status').textContent = notice;
}

function updateEntry() {
  const total = Number($('score').value);
  $('double-option').hidden = game.rule !== 'double' || total !== game.scores[game.active] || game.winner !== null;
  const terminal = boardTerminal();
  $('dart-slots').replaceChildren(...[0, 1, 2].map(i => textElement('span', darts[i]?.label ?? `Dart ${i + 1}`, 'dart-slot' + (darts[i] ? ' filled' : ''))));
  $('board-total').replaceChildren(document.createTextNode(darts.reduce((s, d) => s + d.value, 0) + ' '), textElement('small', 'points'));
  $('miss').disabled = darts.length >= 3 || game.winner !== null || terminal;
  $('remove-dart').disabled = !darts.length;
  $('entry-help').textContent = game.winner !== null ? 'Start a new game for a rematch, or undo the last turn.' : mode === 'board' ? (terminal ? 'Turn complete. Submit your score to continue.' : 'D = double · T = treble · inner bull = 50 · outer bull = 25') : 'Enter the total for your turn, then pass it over.';
  const remaining = game.scores[game.active] - (mode === 'board' ? darts.reduce((sum, dart) => sum + dart.value, 0) : 0);
  const dartsLeft = mode === 'board' ? 3 - darts.length : 3;
  const route = game.winner === null && !(mode === 'board' && terminal) ? checkoutRoute(remaining, game.rule, dartsLeft) : null;
  $('checkout').hidden = !route;
  if (route) {
    $('checkout-title').textContent = `${game.names[game.active]}, finish ${remaining} in ${route.length} dart${route.length === 1 ? '' : 's'}`;
    $('checkout-route').replaceChildren(...route.map((target, index) => {
      const step = textElement('div', '', 'checkout-target');
      step.setAttribute('aria-label', `${target.name}, ${target.value} points`);
      step.append(textElement('small', `DART ${(mode === 'board' ? darts.length : 0) + index + 1}`), textElement('strong', target.label), textElement('small', `${target.value} points`));
      return step;
    }));
    $('checkout-note').textContent = route.map(target => target.value).join(' + ') + ` = ${remaining} · ` + (game.rule === 'double' ? 'Finish on a double.' : 'Exactly zero wins.');
  }
}
function boardTerminal() {
  if (!darts.length) return false;
  const total = darts.reduce((s, d) => s + d.value, 0);
  const remaining = game.scores[game.active] - total;
  return remaining <= 0 || (game.rule === 'double' && remaining === 1);
}
function clearDraft() { darts = []; $('score').value = ''; $('last-double').checked = false; }
function addDart(value, label, double) {
  if (darts.length >= 3 || game.winner !== null || boardTerminal()) return;
  darts.push({ value, label, double });
  notice = ''; $('status').textContent = ''; updateEntry();
}
function setMode(next) {
  mode = next;
  clearDraft();
  for (const name of ['keypad', 'board']) {
    $(name + '-view').hidden = mode !== name;
    $(name + '-tab').classList.toggle('selected', mode === name);
    $(name + '-tab').setAttribute('aria-pressed', String(mode === name));
  }
  updateEntry();
}
$('keypad-tab').onclick = () => setMode('keypad');
$('board-tab').onclick = () => setMode('board');
$('score').addEventListener('input', () => {
  $('score').value = $('score').value.replace(/\D/g, '').slice(0, 3);
  $('last-double').checked = false;
  $('status').textContent = '';
  updateEntry();
});
$('keypad').onclick = event => {
  const key = event.target.closest('[data-key]')?.dataset.key;
  if (!key || game.winner !== null) return;
  const input = $('score');
  if (key === 'clear') input.value = '';
  else if (key === 'back') input.value = input.value.slice(0, -1);
  else input.value = (input.value === '0' ? key : input.value + key).slice(0, 3);
  $('last-double').checked = false;
  $('status').textContent = '';
  updateEntry();
};
document.querySelectorAll('[data-total]').forEach(button => button.onclick = () => {
  $('score').value = button.dataset.total;
  $('last-double').checked = false;
  $('status').textContent = '';
  updateEntry();
});
$('submit-score').onclick = () => {
  if (game.winner !== null) return;
  if ((mode === 'keypad' && $('score').value === '') || (mode === 'board' && !darts.length)) { $('status').textContent = 'Enter a score first. Use 0 for a missed turn.'; return; }
  const total = mode === 'keypad' ? Number($('score').value) : darts.reduce((s, d) => s + d.value, 0);
  const double = mode === 'keypad' ? $('last-double').checked : darts.at(-1)?.double;
  try {
    const player = game.active;
    game = playTurn(game, total, double);
    const turn = game.history.at(-1);
    notice = game.winner !== null ? `${game.names[player]} wins! Nicely thrown.` : turn.bust ? `Bust! ${game.names[player]} stays on ${turn.before}. ${game.names[game.active]}, you’re up.` : `${total} scored. ${game.names[game.active]}, you’re up.`;
    clearDraft(); persist(); render();
  } catch (error) { $('status').textContent = error.message; }
};
$('score').addEventListener('keydown', event => { if (event.key === 'Enter') $('submit-score').click(); });
$('undo').onclick = () => { game = undoTurn(game); clearDraft(); notice = 'Last turn undone. ' + game.names[game.active] + ', you’re up.'; persist(); render(); };
$('miss').onclick = () => addDart(0, 'Miss', false);
$('remove-dart').onclick = () => { darts.pop(); updateEntry(); };
function updatePlayerFields() {
  const thirdPlayer = $('player-count').value === '3';
  $('player-3-field').hidden = !thirdPlayer;
  $('name-3').disabled = !thirdPlayer;
  updateStarterOptions();
}
function updateStarterOptions() {
  const selected = $('starting-player').value;
  const options = Array.from({ length: Number($('player-count').value) }, (_, index) => {
    const option = textElement('option', $('name-' + (index + 1)).value.trim() || `Player ${index + 1}`);
    option.value = String(index);
    return option;
  });
  const random = textElement('option', 'Choose randomly');
  random.value = 'random';
  $('starting-player').replaceChildren(...options, random);
  $('starting-player').value = selected === 'random' || options.some(option => option.value === selected) ? selected : '0';
}
for (const id of ['name-1', 'name-2', 'name-3']) $(id).addEventListener('input', updateStarterOptions);
$('player-count').onchange = updatePlayerFields;
$('new-game').onclick = () => {
  $('start-score').value = game.start;
  $('finish-rule').value = game.rule;
  $('name-1').value = game.names[0]; $('name-2').value = game.names[1];
  $('player-count').value = String(game.names.length);
  $('name-3').value = game.names[2] || 'Player 3';
  updatePlayerFields();
  $('starting-player').value = String(game.starter ?? 0);
  $('setup').showModal();
};
$('cancel-setup').onclick = () => $('setup').close();
$('setup-form').onsubmit = event => {
  event.preventDefault();
  const names = Array.from({ length: Number($('player-count').value) }, (_, i) => $('name-' + (i + 1)).value.trim() || `Player ${i + 1}`);
  const startingPlayer = $('starting-player').value;
  game = newGame(Number($('start-score').value), $('finish-rule').value, names, startingPlayer === 'random' ? 'random' : Number(startingPlayer));
  clearDraft(); notice = `${game.names[game.starter]} starts${startingPlayer === 'random' ? ' — randomly selected' : ''}!`; persist(); render(); $('setup').close();
};

const ns = 'http://www.w3.org/2000/svg';
function svgElement(tag, attrs) {
  const element = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  return element;
}
function buildBoard() {
  const svg = svgElement('svg', { viewBox: '-180 -180 360 360', class: 'board-svg', role: 'group', 'aria-label': 'Dartboard. Select a scoring segment for each dart.' });
  svg.append(svgElement('circle', { r: 179, fill: '#26342f' }));
  const numbers = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const point = (r, angle) => [r * Math.sin(angle * Math.PI / 180), -r * Math.cos(angle * Math.PI / 180)];
  function interactive(el, value, label, double = false) {
    el.setAttribute('data-value', value);
    el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); el.setAttribute('aria-label', `${label}: ${value} points`);
    el.addEventListener('click', () => addDart(value, label, double));
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addDart(value, label, double); } });
    svg.append(el);
  }
  numbers.forEach((number, i) => {
    const a = i * 18 - 9, b = i * 18 + 9;
    [[16, 87, 1], [87, 115, 3], [115, 154, 1], [154, 176, 2]].forEach(([inner, outer, multiple]) => {
      const p = point(outer, a), q = point(outer, b), r = point(inner, b), s = point(inner, a);
      const d = `M${p} A${outer},${outer} 0 0 1 ${q} L${r} A${inner},${inner} 0 0 0 ${s} Z`;
      const label = `${multiple === 2 ? 'D' : multiple === 3 ? 'T' : ''}${number}`;
      const segment = svgElement('path', { d, fill: multiple === 1 ? (i % 2 ? '#ede6d2' : '#313c35') : (i % 2 ? '#517c62' : '#d66c51'), stroke: '#a4ac94', 'stroke-width': .65 });
      interactive(segment, number * multiple, label, multiple === 2);
    });
    const [x, y] = point(134.5, i * 18);
    const text = svgElement('text', { x, y, fill: i % 2 ? '#26342f' : '#f7f0dc', 'font-size': 17, 'font-weight': 700, 'font-family': 'DM Sans, sans-serif', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'pointer-events': 'none' });
    text.textContent = number; svg.append(text);

  });
  interactive(svgElement('circle', { r: 16, fill: '#517c62', stroke: '#b6bea4', 'stroke-width': .7 }), 25, 'Outer bull');
  interactive(svgElement('circle', { r: 7, fill: '#d66c51', stroke: '#b6bea4', 'stroke-width': .7 }), 50, 'Bull', true);
  $('dartboard').replaceChildren(svg);
}
buildBoard();
render();
persist();
