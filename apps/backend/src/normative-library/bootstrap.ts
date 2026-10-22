import type { Kysely } from 'kysely';
import type { FoundationDatabase } from '../database.js';
import type { FileStoragePort } from '../ports/file-storage.js';
import { MinioFileStoragePort } from '../ports/minio-file-storage.js';
import { FoundationError } from '../errors.js';
import type { CursorPort } from './matrices.js';
import type { UseEnvironment } from './rights.js';
import { composeNormativeLibraryFromStorage } from './composition.js';

/** Same database, private storage and signed cursor as the canonical bootstrap.
 * No registry/data activation, startup DDL, alternate signing key or permissive port.
 */
export async function composeNormativeLibraryForBootstrap(deps: {
  database: Kysely<FoundationDatabase>;
  fileStorage: FileStoragePort;
  environment: UseEnvironment;
  cursor: CursorPort | undefined;
}) {
  if (!(deps.fileStorage instanceof MinioFileStoragePort) || !deps.cursor) {
    throw new FoundationError('TCDX.DEPENDENCY.UNAVAILABLE',
      'Normative library requires canonical private storage and signed cursors', 503, true);
  }
  return composeNormativeLibraryFromStorage({ ...deps, fileStorage: deps.fileStorage, cursor: deps.cursor });
}
