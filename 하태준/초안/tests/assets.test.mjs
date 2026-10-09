import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { ACTION_SCENES } from '../src/action-scenes.mjs';

test('every normal and accident shot exists as a complete landscape photo', async () => {
  const files = new Set(Object.values(ACTION_SCENES).flatMap(scene => [...scene.shots, ...(scene.accidentShots ?? [])].map(shot => shot.file)));
  for (const file of files) {
    assert.match(file, /^v2\/[a-z-]+$/);
    const data = await readFile(new URL(`../assets/actions/${file}.png`, import.meta.url));
    assert.equal(data.subarray(1, 4).toString(), 'PNG', file);
    const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
    assert.ok(width >= 1536 && height >= 864, `${file}: insufficient source pixels`);
    assert.ok(Math.abs(width / height - 16 / 9) < .01, `${file}: incompatible framing`);
    assert.ok(data.length > 100000, `${file}: unexpectedly empty photo`);
  }
});
