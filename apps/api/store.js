import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBoard } from '@kanban/shared';

const here = dirname(fileURLToPath(import.meta.url));

export const DEFAULT_BOARD_FILE =
  process.env.BOARD_FILE || resolve(here, 'data', 'board.json');

export function createStore(file = DEFAULT_BOARD_FILE) {
  return {
    file,

    async read() {
      try {
        const raw = await readFile(file, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed;
      } catch (err) {
        if (err.code === 'ENOENT') return createBoard();
        throw err;
      }
    },

    async write(board) {
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(board, null, 2), 'utf8');
      return board;
    },
  };
}
