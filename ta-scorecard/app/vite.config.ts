import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds ONE self-contained HTML file that runs offline from the local disk.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: { outDir: 'dist', chunkSizeWarningLimit: 5000 },
  test: { environment: 'node' },
});
