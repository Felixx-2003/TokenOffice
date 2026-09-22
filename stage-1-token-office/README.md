# Token Office — Stage 1

Stage 1 of the incremental-game series. A fictional idle game about prompting ten animated model desks. Click a desk or press Space anywhere to earn Tokens. Start with open-weight models, upgrade plans and stars, collect five Auto Whips, then raise every skill to five stars. AGI, ASI, and Tibo trigger full-screen effects. The game includes looping procedural music and unlock sounds. The short design is in [PLAN.md](PLAN.md). No real AI requests are made.

## Play locally

1. Install [Node.js](https://nodejs.org/) 20.19+ or 22.12+.
2. Run `npm install` (`npm.cmd install` in Windows PowerShell if script execution is blocked).
3. Run `npm run dev` (`npm.cmd run dev` in that PowerShell case) and open the address Vite prints, usually `http://127.0.0.1:5173/`.

Opening `index.html` directly is not supported because the game uses Vite. A new game starts with 0 Tokens and saves locally in this browser. Run `npm run build` for a static production bundle in `dist/`.
