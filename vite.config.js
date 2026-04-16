import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/time_tracker.html',
    },
  },
  plugins: [viteSingleFile()],
  test: {
    root: '.',
    include: ['src/**/*.test.js'],
    environment: 'node',
  },
});
