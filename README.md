# Pocket Grove

A small, cozy incremental game prototype. Harvest for Cash, buy automatic earners, and restore a floating garden. Press Space anywhere to harvest. The design is in [PLAN.md](PLAN.md).

## Play locally

1. Install [Node.js](https://nodejs.org/) 20.19+ or 22.12+.
2. Run `npm install` (`npm.cmd install` in Windows PowerShell if script execution is blocked).
3. Run `npm run dev` (`npm.cmd run dev` in that PowerShell case) and open the local address Vite prints (usually `http://127.0.0.1:5173/`).

This TypeScript game uses Vite, so opening `index.html` directly is not supported. Progress saves in this browser's local storage. Run `npm run build` to create a static site in `dist/`.
