import { useEffect, useState } from 'react';
import type { MemoryMedia } from '../types/domain';
import { memoryTreeRepository } from '../lib/repository';

interface SecureMediaProps {
  media: MemoryMedia;
  alt?: string;
}

type LoadState = 'loading' | 'ready' | 'error';

function useSignedMedia(media: MemoryMedia) {
  const [state, setState] = useState<LoadState>('loading');
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setError(null);
    setUrl(null);
    memoryTreeRepository.createTemporaryMediaAccess(media.id)
      .then(access => {
        if (cancelled) return;
        setUrl(access.signedUrl);
        setState('ready');
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to load private media.');
        setState('error');
      });
    return () => { cancelled = true; };
  }, [media.id]);

  return { state, url, error };
}

function MediaFrame({ children, state, error }: { children: React.ReactNode; state: LoadState; error: string | null }) {
  if (state === 'loading') return <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-950">Loading secure media...</div>;
  if (state === 'error') return <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Private media unavailable: {error}</div>;
  return <>{children}</>;
}

export function VideoPlayer({ media }: SecureMediaProps) {
  const signed = useSignedMedia(media);
  return <MediaFrame state={signed.state} error={signed.error}>{signed.url && <video className="w-full rounded-3xl bg-black" src={signed.url} controls playsInline preload="metadata" />}</MediaFrame>;
}

export function ImageViewer({ media, alt = 'Family memory' }: SecureMediaProps) {
  const signed = useSignedMedia(media);
  return <MediaFrame state={signed.state} error={signed.error}>{signed.url && <img className="max-h-[80vh] w-full rounded-3xl object-contain" src={signed.url} alt={alt} />}</MediaFrame>;
}

export function AudioPlayer({ media }: SecureMediaProps) {
  const signed = useSignedMedia(media);
  return <MediaFrame state={signed.state} error={signed.error}>{signed.url && <audio className="w-full" src={signed.url} controls preload="metadata" />}</MediaFrame>;
}
