import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  publicDir: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        weekplan: resolve(__dirname, 'src/weekplan.html'),
        preferences: resolve(__dirname, 'src/preferences.html'),
        recipe: resolve(__dirname, 'src/ai-recipe-planner.html'),
        apiManager: resolve(__dirname, 'src/tools/api-manager.html')
      }
    }
  }
});
