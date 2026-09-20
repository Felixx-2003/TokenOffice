# Pocket Grove

A small, cozy incremental game prototype. Tend a seed, buy producers, and restore a floating garden. The design is in [PLAN.md](PLAN.md).

## Play locally

1. Install [Node.js](https://nodejs.org/) 20.19+ or 22.12+.
2. Run `npm install`.
3. Run `npm run dev` and open the local address Vite prints (usually `http://127.0.0.1:5173/`).

This TypeScript game uses Vite, so opening `index.html` directly is not supported. Progress saves in this browser's local storage. Run `npm run build` to create a static site in `dist/`.
