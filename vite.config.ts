import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' hace que el sitio funcione en https://usuario.github.io/nombre-del-repo/
export default defineConfig({ base: './', plugins: [react()] });
