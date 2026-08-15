import { describe, expect, it } from 'vitest';
import App from '../App';
import { AppDashboardPage } from '../pages/Pages';
import { demoArchiveState } from '../lib/archiveData';

describe('Moms MemoryTree app shell', () => {
  it('exports the application component', () => {
    expect(App).toBeTypeOf('function');
  });

  it('exposes the app dashboard surface with honest foundation status', () => {
    const element = AppDashboardPage({ archive: demoArchiveState(), mode: 'demo' });
    const serialized = JSON.stringify(element);

    expect(serialized).toContain('Preview is controlled. Launch blockers are exposed.');
    expect(serialized).toContain('Foundation checkpoints');
    expect(serialized).toContain('Stage ');
    expect(serialized).toContain('Pre-dashboard handoff');
    expect(serialized).toContain('Provider matrix');
    expect(serialized).toContain('Deployment blockers');
    expect(serialized).toContain('Not a backup claim.');
    expect(serialized).toContain('Foundation only');
  });
});
