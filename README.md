# Omni Electron Scaffold

A ready-to-ship Electron + Vite + React starter with Tailwind CSS and a hardened preload bridge.

## Getting started

```bash
npm install
npm run dev
```

The dev command launches the renderer dev server and opens the Electron window with a sidebar stub so you can iterate quickly.

## Production build

To generate distributable installers, run:

```bash
npm run make
```

The command runs Electron Forge, bundles the main and preload processes with Vite, and emits platform-specific installers into the `out/make` directory.

## Security defaults

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- Preload exposes a frozen and typed API surface via `window.appApi`

Use `src/shared/api.ts` to extend the bridge contract between the main and renderer processes.
