import { resolve } from 'path';
import { readFile, writeFileSync } from 'fs';
import * as envfile from 'envfile';

export const writeEnvToFile = (
  envVariables: { key: string; value: string }[],
): void => {
  // get `.env` from path of current directory
  const path = resolve(__dirname, '../../.env');
  readFile(path, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }

    const parsedFile = envfile.parse(data);
    envVariables.forEach((envVar: { key: string; value: string }) => {
      if (envVar.key && envVar.value) {
        parsedFile[envVar.key] = envVar.value;
      }
    });
    writeFileSync(path, envfile.stringify(parsedFile));
  });
};
