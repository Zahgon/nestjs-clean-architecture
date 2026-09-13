// Only For module alias
import * as moduleAlias from 'module-alias';
import 'module-alias/register';
import * as path from 'path';

moduleAlias.addAliases({
  '@domain': path.resolve(__dirname, 'domain'),
  '@application': path.resolve(__dirname, 'application'),
  '@infrastructure': path.resolve(__dirname, 'infrastructure'),
  '@api': path.resolve(__dirname, 'api'),
  '@constants': path.format({ dir: __dirname, name: 'constants' }),
});

// App modules
import 'reflect-metadata';
import { APP_PORT } from '@constants';
import { createApp } from '@api/server';
import { CompositionRoot } from './composition-root';

async function bootstrap() {
  const root = await CompositionRoot.create();
  const app = createApp(root);

  await new Promise<void>((resolve) => {
    app.listen(APP_PORT, () => resolve());
  });
  console.log('Running on port ==> ', APP_PORT);
}
bootstrap();
