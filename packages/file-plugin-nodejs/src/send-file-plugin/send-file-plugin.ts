import { defineKoriPlugin } from '@korix/kori';
import { type KoriEnvironment, type KoriPlugin, type KoriRequest, type KoriResponse } from '@korix/kori';

import { PLUGIN_VERSION } from '../version/index.js';

import { handleFileResponse, type DownloadOptions, type SendFileOptions } from './handle-file-response.js';

const PLUGIN_NAME = 'send-file-plugin-nodejs';

export type SendFileOption = {
  root?: string;
};

export type SendFileExtension = {
  sendFile(filePath: string, options?: SendFileOptions): Promise<KoriResponse>;
  download(filePath: string, options?: DownloadOptions): Promise<KoriResponse>;
};

export function sendFilePlugin<Env extends KoriEnvironment, Req extends KoriRequest, Res extends KoriResponse>(
  options: SendFileOption = {},
): KoriPlugin<Env, Req, Res, unknown, unknown, SendFileExtension> {
  const { root } = options;

  return defineKoriPlugin({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
    apply: (kori) => {
      const log = kori.log().child(PLUGIN_NAME);
      log.info('Send file plugin initialized', { root });

      return kori.onRequest((ctx) => {
        const sendFile = (filePath: string, sendFileOptions?: SendFileOptions) =>
          handleFileResponse({
            ctx,
            log,
            filePath,
            mode: 'sendFile',
            options: sendFileOptions,
            pluginRoot: root,
          });

        const download = (filePath: string, downloadOptions?: DownloadOptions) =>
          handleFileResponse({
            ctx,
            log,
            filePath,
            mode: 'download',
            options: downloadOptions,
            pluginRoot: root,
          });

        return ctx.withRes({ sendFile, download });
      });
    },
  });
}
