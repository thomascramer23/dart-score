export function newGame(start = 501, rule = 'straight', names = ['Player 1', 'Player 2'], startingPlayer = 0) {
  const starter = startingPlayer === 'random' ? Math.floor(Math.random() * names.length) : startingPlayer;
  if (!Number.isInteger(starter) || starter < 0 || starter >= names.length) throw new Error('Choose a valid starting player.');
  return { start, rule, names, starter, scores: names.map(() => start), active: starter, winner: null, history: [] };
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

// Prefer fewer darts, then simpler targets and commonly used finishing doubles.
export function checkoutRoute(total, rule = 'straight', dartsLeft = 3) {
  if (!Number.isInteger(total) || total <= 0 || !Number.isInteger(dartsLeft) || dartsLeft < 1 || dartsLeft > 3 || total > dartsLeft * 60) return null;
  const targets = [];
  for (let n = 20; n >= 1; n--) {
    targets.push({ label: `S${n}`, name: `Single ${n}`, value: n, double: false, difficulty: 0 });
    targets.push({ label: `D${n}`, name: `Double ${n}`, value: n * 2, double: true, difficulty: 1 });
    targets.push({ label: `T${n}`, name: `Triple ${n}`, value: n * 3, double: false, difficulty: 2 });
  }
  targets.push({ label: '25', name: 'Outer bull', value: 25, double: false, difficulty: 3 });
  targets.push({ label: 'Bull', name: 'Inner bull', value: 50, double: true, difficulty: 4 });
  const doubles = [40, 32, 36, 24, 20, 16, 12, 8, 4, 2, 38, 34, 30, 28, 26, 22, 18, 14, 10, 6, 50];
  const memo = new Map();
  function search(remaining, count) {
    if (remaining <= 0 || remaining > count * 60 || (rule === 'double' && remaining === 1)) return null;
    const key = `${remaining}:${count}`;
    if (memo.has(key)) return memo.get(key);
    let best = null;
    for (const target of targets) {
      let route, cost;
      if (count === 1) {
        if (target.value !== remaining || (rule === 'double' && !target.double)) continue;
        route = [target];
        cost = rule === 'double' ? doubles.indexOf(target.value) / 100 : target.difficulty;
      } else {
        const rest = search(remaining - target.value, count - 1);
        if (!rest) continue;
        route = [target, ...rest.route];
        cost = target.difficulty + rest.cost;
      }
      if (!best || cost < best.cost) best = { route, cost };
    }
    memo.set(key, best);
    return best;
  }
  for (let count = 1; count <= dartsLeft; count++) {
    const result = search(total, count);
    if (result) return result.route;
  }
  return null;
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
