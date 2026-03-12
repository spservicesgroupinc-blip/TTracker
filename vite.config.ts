import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
          manifest: {
            name: "RFE Time Tracker",
            short_name: "RFE Tracker",
            description: "RFE Foam Equipment — Track your work hours with GPS location verification. Clock in/out, manage projects & jobs, and generate professional pay reports.",
            start_url: "/",
            scope: "/",
            display: "standalone",
            background_color: "#F0F0F0",
            theme_color: "#CC0000",
            orientation: "any",
            id: "/",
            categories: ["productivity", "business", "utilities"],
            icons: [
              {
                src: "/icon.svg",
                sizes: "any",
                type: "image/svg+xml",
                purpose: "any"
              },
              {
                src: "/icon-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any maskable"
              },
              {
                src: "/icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any maskable"
              }
            ],
            screenshots: [
              {
                src: "/icon.svg",
                sizes: "512x512",
                type: "image/svg+xml",
                form_factor: "wide",
                label: "RFE Time Tracker on Desktop"
              },
              {
                src: "/icon.svg",
                sizes: "512x512",
                type: "image/svg+xml",
                form_factor: "narrow",
                label: "RFE Time Tracker on Mobile"
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}'],
            maximumFileSizeToCacheInBytes: 5000000 // 5MB limit
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
