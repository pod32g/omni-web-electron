import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  build: {
    sourcemap: true,
    outDir: path.resolve(__dirname, '.vite/build'),
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/main/main.ts'),
      formats: ['es'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: [
        'electron',
        ...builtinModules,
        ...builtinModules.map((moduleName) => `node:${moduleName}`),
      ],
    },
  },
});
