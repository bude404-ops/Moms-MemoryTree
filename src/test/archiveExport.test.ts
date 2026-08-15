import { describe, expect, it } from 'vitest';
import { demoArchiveState } from '../lib/archiveData';
import { createArchiveExportManifest } from '../lib/archiveExport';

const exportedAt = '2026-08-15T00:00:00.000Z';

describe('archive export manifest', () => {
  it('indexes family archive counts, privacy, and media bytes', () => {
    const archive = demoArchiveState();
    const manifest = createArchiveExportManifest(archive, exportedAt);

    expect(manifest.manifestVersion).toBe('memorytree-export-v1');
    expect(manifest.exportedAt).toBe(exportedAt);
    expect(manifest.family.id).toBe(archive.family.id);
    expect(manifest.counts.memories).toBe(archive.memories.length);
    expect(manifest.counts.media).toBe(archive.media.length);
    expect(manifest.media.totalBytes).toBe(archive.media.reduce((sum, media) => sum + media.bytes, 0));
    expect(manifest.privacy.privateMemories + manifest.privacy.familyMemories + manifest.privacy.specificPeopleMemories + manifest.privacy.descendantsMemories + manifest.privacy.legacyMemories).toBe(archive.memories.length);
  });

  it('marks exported media as signed-access records, not public files', () => {
    const manifest = createArchiveExportManifest(demoArchiveState(), exportedAt);

    expect(manifest.media.files.length).toBeGreaterThan(0);
    expect(manifest.media.files.every(file => file.requiresSignedAccess)).toBe(true);
    expect(manifest.memories.some(memory => memory.mediaCount > 0)).toBe(true);
  });

  it('warns when the manifest comes from demo data', () => {
    const manifest = createArchiveExportManifest(demoArchiveState(), exportedAt);

    expect(manifest.warnings).toContain('This manifest was generated from local demo data; it is not a verified cloud backup.');
  });
});
