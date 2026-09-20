# Pocket Arcade

A compact arcade incremental game. Press Space anywhere or click Play for Cash, then collect Common, Rare, Epic, and Legendary machines. At Level 3, your free Auto Player starts playing for you. The design is in [PLAN.md](PLAN.md).

## Play locally

1. Install [Node.js](https://nodejs.org/) 20.19+ or 22.12+.
2. Run `npm install` (`npm.cmd install` in Windows PowerShell if script execution is blocked).
3. Run `npm run dev` (`npm.cmd run dev` in that PowerShell case) and open the address Vite prints (usually `http://127.0.0.1:5173/`).

The game uses Vite, so opening `index.html` directly is not supported. Progress saves in this browser's local storage. Existing Pocket Grove saves migrate to the arcade. Run `npm run build` to create a static site in `dist/`.
