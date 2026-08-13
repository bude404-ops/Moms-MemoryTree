import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { RecordPage } from '../pages/Pages';
import { demoArchiveState } from '../lib/archiveData';

describe('RecordPage preservation UI', () => {
  it('does not claim selected media is preserved before save chain completes', () => {
    const html = renderToStaticMarkup(<RecordPage archive={demoArchiveState()} onCreate={vi.fn()} />);
    expect(html).toContain('Local draft');
    expect(html).toContain('Nothing is preserved until you save');
    expect(html).toContain('No success is shown until the chain completes');
    expect(html).toContain('Preserve Memory');
  });
});
