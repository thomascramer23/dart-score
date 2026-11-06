export function gameRecap(game) {
  return game.names.map((name, player) => {
    const turns = game.history.filter(turn => turn.player === player);
    const credited = turns.map(turn => turn.bust ? 0 : turn.total);
    const scored = credited.reduce((sum, total) => sum + total, 0);
    return {
      name, player, winner: game.winner === player, remaining: game.scores[player],
      turns: turns.length, scored, average: turns.length ? scored / turns.length : null,
      highest: turns.length ? Math.max(...credited) : null,
      busts: turns.filter(turn => turn.bust).length,
      checkout: game.winner === player ? turns.at(-1).total : null,
    };
  });
}

export function rememberNames(previous, current) {
  return Array.from({ length: 3 }, (_, index) => current[index]?.trim() || previous[index]?.trim() || `Player ${index + 1}`);
}

export function turnFeedback(game) {
  const turn = game.history.at(-1);
  if (!turn) return null;
  const name = game.names[turn.player];
  if (game.winner !== null) return { kind: 'win', title: 'Game shot!', detail: `${name} wins with a ${turn.total}-point finish.` };
  return {
    kind: turn.bust ? 'bust' : 'score',
    title: turn.bust ? 'Bust!' : `${turn.total} scored`,
    detail: `${name}: ${turn.before} → ${turn.after}. ${game.names[game.active]}, you’re up.`,
  };
}
