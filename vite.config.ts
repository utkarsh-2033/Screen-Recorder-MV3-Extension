import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    webExtension({
      additionalInputs: [
        'src/offscreen/offscreen.html',
        'src/pages/extension-auth/extension-auth.html',
        'src/pages/camera/camera.html',
      ],
      manifest: () => {
        // Dynamically inject env-specific host permissions
        const isProd = mode === 'production';
        return {
          manifest_version: 3,
          name: 'ClipIQ Recorder',
          version: '1.0.0',
          description: 'Professional screen recorder — record, share, and analyze videos with AI',
          author: 'ClipIQ',

          icons: {
            16: 'assets/icons/icon-16.png',
            32: 'assets/icons/icon-32.png',
            48: 'assets/icons/icon-48.png',
            128: 'assets/icons/icon-128.png',
          },

          action: {
            default_popup: 'src/popup/popup.html',
            default_icon: {
              16: 'assets/icons/icon-16.png',
              32: 'assets/icons/icon-32.png',
              48: 'assets/icons/icon-48.png',
            },
            default_title: 'ClipIQ Recorder',
          },

          background: {
            service_worker: 'src/background/background.ts',
            type: 'module',
          },

          content_scripts: [
            {
              matches: ['http://*/*', 'https://*/*'],
              js: ['src/content/content.ts'],
              css: ['src/content/styles/content.css'],
              run_at: 'document_end',
            },
          ],

          permissions: [
            'tabCapture',
            'offscreen',
            'storage',
            'tabs',
            'activeTab',
            'scripting',
            'alarms',
            'notifications',
          ],

          host_permissions: [
            'http://localhost:3000/*',
            'http://localhost:5000/*',
            'https://clipiq.onrender.com/*',
            'https://clipiq.vercel.app/*',
            'https://*.clerk.com/*',
            'https://*.clerk.dev/*',
          ],

          web_accessible_resources: [
            {
              resources: [
                'src/offscreen/offscreen.html',
                'src/pages/extension-auth/extension-auth.html',
                'src/pages/camera/camera.html',
                'assets/icons/*',
              ],
              matches: ['<all_urls>'],
            },
          ],

          content_security_policy: {
            extension_pages:
              "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com",
          },



          // Allow clipiq.vercel.app and localhost:3000 to send messages to extension
          externally_connectable: {
            matches: [
              'http://localhost:3000/*',
              'https://clipiq.vercel.app/*',
            ],
          },
          commands: {
            'toggle-recording': {
              suggested_key: {
                default: 'Alt+Shift+R',
                mac: 'Alt+Shift+R'
              },
              description: 'Start or Stop recording'
            },
            'toggle-pause': {
              suggested_key: {
                default: 'Alt+Shift+P',
                mac: 'Alt+Shift+P'
              },
              description: 'Pause or Resume recording'
            }
          },
          options_ui: {
            page: 'src/pages/options/options.html',
            open_in_tab: true,
          },
        };
      },
    }),
  ],

  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@background': path.resolve(__dirname, 'src/background'),
      '@popup': path.resolve(__dirname, 'src/popup'),
      '@content': path.resolve(__dirname, 'src/content'),
      '@offscreen': path.resolve(__dirname, 'src/offscreen'),
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
    minify: mode === 'production',
    target: 'esnext',
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },

  define: {
    __DEV__: mode === 'development',
    __SOCKET_URL__: JSON.stringify(
      mode === 'production'
        ? 'https://clipiq.onrender.com'
        : 'http://localhost:5001'
    ),
    __HOST_URL__: JSON.stringify(
      mode === 'production'
        ? 'https://clipiq.vercel.app'
        : 'http://localhost:3000'
    ),
  },
}));
