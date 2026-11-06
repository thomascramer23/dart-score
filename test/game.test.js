import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, playTurn, undoTurn, canFinishDouble, checkoutRoute } from '../public/game.js';

test('scores alternate and bust restores the starting score of the turn', () => {
  let game = newGame(301);
  game = playTurn(game, 180);
  assert.deepEqual(game.scores, [121, 301]);
  assert.equal(game.active, 1);
  game = playTurn(game, 60);
  game = playTurn(game, 180);
  assert.deepEqual(game.scores, [121, 241]);
  assert.equal(game.history.at(-1).bust, true);
  assert.equal(game.active, 1);
});
test('exact zero wins and undo reopens the game', () => {
  let game = newGame(301);
  game = playTurn(game, 180); game = playTurn(game, 0);
  const before = game;
  game = playTurn(game, 121);
  assert.equal(game.winner, 0);
  assert.deepEqual(undoTurn(game), before);
  assert.throws(() => playTurn(game, 0));
});
test('double out busts on one or a non-double checkout; double checkout wins', () => {
  let game = newGame(301, 'double');
  game = playTurn(game, 180); game = playTurn(game, 0);
  const before = game;
  game = playTurn(game, 120);
  assert.equal(game.history.at(-1).bust, true);
  game = undoTurn(game);
  assert.deepEqual(game, before);
  game = playTurn(game, 121, false);
  assert.equal(game.history.at(-1).bust, true);
  game = playTurn(undoTurn(game), 121, true);
  assert.equal(game.winner, 0);
});
test('bull can finish and zero is a valid turn', () => {
  let game = newGame(301, 'double');
  for (const total of [180, 0, 71, 0]) game = playTurn(game, total);
  game = playTurn(game, 50, true);
  assert.equal(game.winner, 0);
});
test('invalid or impossible totals cannot alter the game', () => {
  const game = newGame();
  for (const total of [-1, 181, 179, 178, 1.5, NaN]) assert.throws(() => playTurn(game, total));
  assert.equal(game.history.length, 0);
  assert.equal(playTurn(game, 180).scores[0], 321);
});
test('saved turns replay into the same game; undo crosses a bust correctly', () => {
  let game = newGame(301, 'double', ['Alex', 'Sam']);
  for (const total of [180, 60, 180, 100]) game = playTurn(game, total);
  const saved = JSON.parse(JSON.stringify(game));
  let restored = newGame(saved.start, saved.rule, saved.names, saved.starter ?? 0);
  for (const turn of saved.history) restored = playTurn(restored, turn.total, turn.lastDouble);
  assert.deepEqual(restored, game);
  restored = undoTurn(undoTurn(restored));
  assert.deepEqual(restored.scores, [121, 241]);
  assert.equal(restored.active, 0);
});
test('double checkouts must be achievable within three darts', () => {
  assert.equal(canFinishDouble(170), true);
  assert.equal(canFinishDouble(121), true);
  assert.equal(canFinishDouble(50), true);
  for (const total of [1, 159, 162, 163, 165, 166, 168, 169, 171, 180]) assert.equal(canFinishDouble(total), false);
  let game = newGame(301, 'double');
  game = playTurn(game, 142); game = playTurn(game, 0);
  assert.throws(() => playTurn(game, 159, true), /cannot finish on a double/);
});
test('three players rotate in order, including after a bust, and Undo restores the third player', () => {
  let game = newGame(301, 'straight', ['Alex', 'Sam', 'Jo']);
  assert.deepEqual(game.scores, [301, 301, 301]);
  for (const total of [60, 100, 180]) game = playTurn(game, total);
  assert.equal(game.active, 0);
  assert.deepEqual(game.scores, [241, 201, 121]);
  for (const total of [0, 0]) game = playTurn(game, total);
  const before = game;
  game = playTurn(game, 180);
  assert.equal(game.history.at(-1).bust, true);
  assert.equal(game.active, 0);
  assert.deepEqual(undoTurn(game), before);
});
test('third player can win, Undo reopens their turn, and saved three-player games replay', () => {
  let game = newGame(301, 'double', ['Alex', 'Sam', 'Jo']);
  for (const total of [0, 0, 180, 0, 0]) game = playTurn(game, total);
  const before = game;
  game = playTurn(game, 121, true);
  assert.equal(game.winner, 2);
  assert.deepEqual(game.scores, [301, 301, 0]);
  assert.deepEqual(undoTurn(game), before);
  const saved = JSON.parse(JSON.stringify(game));
  let restored = newGame(saved.start, saved.rule, saved.names, saved.starter ?? 0);
  for (const turn of saved.history) restored = playTurn(restored, turn.total, turn.lastDouble);
  assert.deepEqual(restored, game);
});

test('checkout routes respect straight out, double out, and remaining darts', () => {
  assert.deepEqual(checkoutRoute(170, 'double').map(t => t.label), ['T20', 'T20', 'Bull']);
  assert.deepEqual(checkoutRoute(100, 'double').map(t => t.label), ['T20', 'D20']);
  assert.deepEqual(checkoutRoute(32, 'double').map(t => t.label), ['D16']);
  assert.deepEqual(checkoutRoute(20, 'straight').map(t => t.label), ['S20']);
  assert.deepEqual(checkoutRoute(60, 'straight', 1).map(t => t.label), ['T20']);
  assert.equal(checkoutRoute(60, 'double', 1), null);
  assert.equal(checkoutRoute(170, 'double', 2), null);
  assert.equal(checkoutRoute(159, 'double'), null);
  assert.equal(checkoutRoute(1, 'double'), null);
  for (const total of [0, -1, 181, 1.5, NaN]) assert.equal(checkoutRoute(total), null);
  assert.equal(checkoutRoute(20, 'straight', 0), null);
});

test('chosen starter survives refresh, turn rotation, and Undo', () => {
  let game = newGame(301, 'double', ['Alex', 'Sam', 'Jo'], 2);
  const initial = game;
  assert.equal(game.active, 2);
  game = playTurn(game, 60);
  assert.equal(game.active, 0);
  assert.deepEqual(undoTurn(game), initial);
  const saved = JSON.parse(JSON.stringify(game));
  let restored = newGame(saved.start, saved.rule, saved.names, saved.starter);
  for (const turn of saved.history) restored = playTurn(restored, turn.total, turn.lastDouble);
  assert.deepEqual(restored, game);
  assert.equal(newGame(501).starter, 0);
});

test('random draw can choose each player and stores the resolved starter', context => {
  for (const count of [2, 3]) {
    for (let index = 0; index < count; index++) {
      const mock = context.mock.method(Math, 'random', () => (index + 0.5) / count);
      const game = newGame(501, 'straight', ['Alex', 'Sam', 'Jo'].slice(0, count), 'random');
      assert.equal(game.starter, index);
      assert.equal(game.active, index);
      assert.equal(mock.mock.callCount(), 1);
      const saved = JSON.parse(JSON.stringify(game));
      const restored = newGame(saved.start, saved.rule, saved.names, saved.starter);
      assert.deepEqual(restored, game);
      assert.equal(mock.mock.callCount(), 1);
      mock.mock.restore();
    }
  }
});

test('all suggested finishes are legal, achievable, and use the fewest darts', () => {
  const hits = new Set([25, 50]);
  for (let n = 1; n <= 20; n++) for (const multiple of [1, 2, 3]) hits.add(n * multiple);
  for (const rule of ['straight', 'double']) {
    let reachable = new Set(rule === 'double' ? [50, ...Array.from({ length: 20 }, (_, i) => (i + 1) * 2)] : hits);
    const minimum = new Map();
    for (let count = 1; count <= 3; count++) {
      for (const value of reachable) if (!minimum.has(value)) minimum.set(value, count);
      reachable = new Set([...reachable].flatMap(value => [...hits].map(hit => value + hit)));
    }
    for (let total = 1; total <= 180; total++) {
      const route = checkoutRoute(total, rule);
      if (!minimum.has(total)) { assert.equal(route, null); continue; }
      assert.equal(route.length, minimum.get(total));
      assert.equal(route.reduce((sum, target) => sum + target.value, 0), total);
      for (const target of route) assert.ok(hits.has(target.value));
      if (rule === 'double') assert.equal(route.at(-1).double, true);
      for (let count = 1; count <= 3; count++) assert.equal(Boolean(checkoutRoute(total, rule, count)), minimum.get(total) <= count);
    }
  }
});
