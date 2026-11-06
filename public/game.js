export function newGame(start = 501, rule = 'straight', names = ['Player 1', 'Player 2']) {
  return { start, rule, names, scores: names.map(() => start), active: 0, winner: null, history: [] };
}
export function isPossibleTotal(total) {
  const singles = new Set([0, 25, 50]);
  for (let n = 1; n <= 20; n++) for (let m = 1; m <= 3; m++) singles.add(n * m);
  for (const a of singles) for (const b of singles) if (singles.has(total - a - b)) return true;
  return false;
}
export function canFinishDouble(total) {
  const singles = new Set([0, 25, 50]);
  for (let n = 1; n <= 20; n++) for (let m = 1; m <= 3; m++) singles.add(n * m);
  const doubles = [50, ...Array.from({ length: 20 }, (_, i) => (i + 1) * 2)];
  return doubles.some(double => [...singles].some(a => singles.has(total - double - a)));
}
export function playTurn(game, total, lastDouble = false) {
  if (game.winner !== null || !Number.isInteger(total) || total < 0 || total > 180 || !isPossibleTotal(total)) throw new Error('Enter a possible three-dart score (0–180).');
  const player = game.active;
  const before = game.scores[player];
  const remaining = before - total;
  if (game.rule === 'double' && remaining === 0 && lastDouble && !canFinishDouble(total)) throw new Error('That total cannot finish on a double in three darts. Check your score.');
  const bust = remaining < 0 || (game.rule === 'double' && (remaining === 1 || (remaining === 0 && !lastDouble)));
  const winner = !bust && remaining === 0 ? player : null;
  const entry = { player, total, before, after: bust ? before : remaining, bust, lastDouble };
  const scores = [...game.scores];
  scores[player] = entry.after;
  return { ...game, scores, active: winner === null ? (player + 1) % game.names.length : player, winner, history: [...game.history, entry] };
}
export function undoTurn(game) {
  if (!game.history.length) return game;
  const entry = game.history.at(-1);
  const scores = [...game.scores];
  scores[entry.player] = entry.before;
  return { ...game, scores, active: entry.player, winner: null, history: game.history.slice(0, -1) };
}
