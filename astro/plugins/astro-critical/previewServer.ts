import { preview } from 'astro';

export async function startPreviewServer() {
  const previewServer = await preview({
    configFile: 'astro.config.mjs',
    mode: 'production',
    server: {
      open: false,
      port: 8089,
    },
    devToolbar: {
      enabled: false,
    },
  });

  return {
    previewServer,
    baseUrl: `http://${previewServer.host}:${previewServer.port}/`,
  };
}
