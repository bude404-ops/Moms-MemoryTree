import { describe, expect, it } from 'vitest';
import App from '../App';

describe('Moms MemoryTree app shell', () => {
  it('exports the application component', () => {
    expect(App).toBeTypeOf('function');
  });
});
