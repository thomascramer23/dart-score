import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, playTurn, undoTurn } from '../public/game.js';
import { gameRecap, rememberNames, turnFeedback } from '../public/recap.js';

test('recap credits valid points, counts busts as zero, and identifies the winner checkout', () => {
  let game = newGame(301, 'straight', ['Alex', 'Sam', 'Jo']);
  for (const total of [180, 0, 0, 180, 60, 0, 121]) game = playTurn(game, total);
  const [alex, sam, jo] = gameRecap(game);
  assert.deepEqual(alex, { name: 'Alex', player: 0, winner: true, remaining: 0, turns: 3, scored: 301, average: 301 / 3, highest: 180, busts: 1, checkout: 121 });
  assert.equal(sam.average, 30);
  assert.equal(sam.highest, 60);
  assert.equal(jo.average, 0);
  assert.equal(jo.checkout, null);
  assert.deepEqual(gameRecap(JSON.parse(JSON.stringify(game))), gameRecap(game));
  const undone = gameRecap(undoTurn(game))[0];
  assert.equal(undone.winner, false);
  assert.equal(undone.checkout, null);
  assert.equal(undone.scored, 180);
  assert.equal(undone.average, 90);
});

test('empty recap distinguishes unplayed players from missed turns', () => {
  let game = newGame();
  assert.equal(gameRecap(game)[0].average, null);
  assert.equal(gameRecap(game)[0].highest, null);
  game = playTurn(game, 0);
  assert.equal(gameRecap(game)[0].average, 0);
  assert.equal(gameRecap(game)[0].highest, 0);
  assert.equal(gameRecap(game)[1].average, null);
});

test('remembered names survive switching from three players to two and back', () => {
  const names = rememberNames([], [' Alex ', 'Sam', 'Jo']);
  assert.deepEqual(names, ['Alex', 'Sam', 'Jo']);
  assert.deepEqual(rememberNames(names, ['Pat', 'Lee']), ['Pat', 'Lee', 'Jo']);
  assert.deepEqual(rememberNames([], []), ['Player 1', 'Player 2', 'Player 3']);
  assert.deepEqual(rememberNames(names, ['', ' ']), names);
});

test('feedback distinguishes a score, zero, bust, and game shot with the next player', () => {
  let game = newGame(301, 'straight', ['Alex', 'Sam']);
  assert.equal(turnFeedback(game), null);
  game = playTurn(game, 180);
  assert.deepEqual(turnFeedback(game), { kind: 'score', title: '180 scored', detail: 'Alex: 301 → 121. Sam, you’re up.' });
  game = playTurn(game, 0);
  assert.equal(turnFeedback(game).title, '0 scored');
  game = playTurn(game, 180);
  assert.deepEqual(turnFeedback(game), { kind: 'bust', title: 'Bust!', detail: 'Alex: 121 → 121. Sam, you’re up.' });
  game = undoTurn(game);
  game = playTurn(game, 121);
  assert.deepEqual(turnFeedback(game), { kind: 'win', title: 'Game shot!', detail: 'Alex wins with a 121-point finish.' });
});
