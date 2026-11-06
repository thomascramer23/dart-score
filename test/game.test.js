import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, playTurn, undoTurn, canFinishDouble } from '../public/game.js';

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
  let restored = newGame(saved.start, saved.rule, saved.names);
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
  let restored = newGame(saved.start, saved.rule, saved.names);
  for (const turn of saved.history) restored = playTurn(restored, turn.total, turn.lastDouble);
  assert.deepEqual(restored, game);
});
