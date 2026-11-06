# double top taily

A mobile-friendly, two- or three-player darts scorekeeper for 301 and 501. No install or build step; requires Node.js 18 or newer.

## Run locally

```sh
npm run dev
```

Open **http://localhost:5173**. The server listens on all network interfaces so you can also use a phone.

## Play on your phone

1. Connect the phone and computer to the same Wi-Fi network.
2. Keep `npm run dev` running on the computer.
3. Find your computer’s local IP in its network settings (on macOS: System Settings → Wi-Fi → Details → IP address).
4. Open `http://YOUR_LOCAL_IP:5173` in your phone browser, for example `http://192.168.1.20:5173`. Allow Node through the computer’s firewall if asked.

Use the phone browser’s “Add to Home Screen” option for quick access. The computer must stay running. Scores are saved separately in each browser and URL; this version does not sync devices. The app requires the local server to load, but has no scoring dependencies on internet services. Fonts fall back to system fonts without internet.

## Rules and controls

- New game selects 301 or 501, straight out or double out, 2 or 3 players, and player names. Player 1 starts; turns cycle through all selected players. Cancel keeps the current game.
- Keypad accepts a turn total, including 0. Impossible three-dart totals and scores over 180 are rejected. Quick scores set the total.
- Dartboard mode: tap the board directly. The familiar dartboard layout is retained, with wider double and triple rings (22 and 28 board units respectively) and both single sections preserved. Numbers sit inside the outer single sections, with contrasting text on light and dark segments. The unused outer number rim is removed so the scoring area fills more of the screen. The board uses nearly the full phone screen width. Scores follow standard darts values despite the enlarged rings. Bulls score 25/50. Enter up to three darts or Miss, then Submit score. D is the outer double ring, T is the inner treble ring. Outer bull scores 25; inner bull scores 50 and counts as a double. A winning or bust dart ends entry immediately. “Last dart” removes a mistaken tap.
- Submitting subtracts points and switches players. A negative remainder busts the whole turn and leaves the previous score.
- Straight out: exactly zero wins. Double out: leaving 1 busts; the last dart must be a double to finish. On keypad check “Last dart was a double” when entering a checkout total.
- A checkout suggestion appears when the current player can finish in up to three darts. It shows targets, their point values, and the calculation, respects the out rule, and recalculates after each dart in board mode. Routes prefer fewer darts, then simpler targets and common finishing doubles.
- Undo restores the previous player and score, including after a bust or win. Switching entry method clears unsubmitted input.
- The game and turn history save in localStorage after every submitted turn, Undo, and New Game. Refresh restores them. Unsubmitted entry is temporary. Clearing browser data removes the save.

## Checks

```sh
npm test
```

Tests cover turn switching, busts, exact finishes, double out, bull finishes, invalid input, Undo, and persisted-history replay.
