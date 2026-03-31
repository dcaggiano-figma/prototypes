import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import clsx from 'clsx';
import { motion } from 'motion/react';
import { Button, ButtonPrimitive, IconButton } from '@figma/fpl-components';
import {
  Icon24FigmaLarge,
  Icon24Play,
  Icon24Pause,
  Icon24Download,
  Icon16ApprovedCheckmark,
  Icon16DragHandle,
  Icon24Close,
} from '@figma/fpl-icons';
import { useAppTheme } from '@prototype/shared';
import { ShareModal } from '../components/ShareModal';
import css from './export.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportItem {
  id: string;
  name: string;
  author: string;
  /** Short looping preview (MP4) for hero + queue thumbnails */
  previewVideoUrl: string;
  status: 'rendering' | 'downloading' | 'done';
  progress: number;
  timeLeftSec: number;
}

// ---------------------------------------------------------------------------
// Fake data
// ---------------------------------------------------------------------------

/** CC0 / sample clips -- distinct motion per queue item */
const PREVIEW_VIDEOS = [
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
];

/** Figma file the export is from (prototype: default untitled doc) */
const SOURCE_FILE_NAME = 'Untitled';
const AUTHOR = 'Daniela Muntyan';

function createInitialItems(): ExportItem[] {
  return [
    {
      id: '1',
      name: 'Figma Logo Animation',
      author: AUTHOR,
      previewVideoUrl: PREVIEW_VIDEOS[0],
      status: 'rendering',
      progress: 0,
      timeLeftSec: 45,
    },
  ];
}

function createDownloadedItem(): ExportItem {
  return {
    id: '0',
    name: 'Hero Section Reveal',
    author: AUTHOR,
    previewVideoUrl: PREVIEW_VIDEOS[0],
    status: 'done',
    progress: 100,
    timeLeftSec: 0,
  };
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

const SPINNER_ARC_PATH =
  'M8.0003 2.50033C8.0003 2.22418 8.22458 1.99815 8.49977 2.02114C9.51013 2.10556 10.4858 2.44488 11.3333 3.01104C12.3198 3.67032 13.0892 4.60819 13.5433 5.7044C13.9972 6.80064 14.1165 8.00748 13.8851 9.1712C13.6535 10.3349 13.0815 11.4035 12.2425 12.2425C11.4035 13.0815 10.3349 13.6535 9.1712 13.8851C8.00748 14.1165 6.80064 13.9972 5.7044 13.5433C4.60819 13.0892 3.67032 12.3198 3.01104 11.3333C2.44488 10.4858 2.10556 9.51013 2.02114 8.49977C1.99815 8.22458 2.22418 8.0003 2.50033 8.0003C2.77646 8.0003 2.99773 8.2247 3.02531 8.49945C3.1069 9.31209 3.38662 10.0955 3.84308 10.7786C4.39246 11.6005 5.17387 12.2411 6.08722 12.6194C7.00069 12.9977 8.00619 13.0975 8.97589 12.9046C9.94567 12.7116 10.8363 12.2346 11.5355 11.5355C12.2346 10.8363 12.7116 9.94567 12.9046 8.97589C13.0975 8.00619 12.9977 7.00069 12.6194 6.08722C12.2411 5.17387 11.6005 4.39246 10.7786 3.84308C10.0955 3.38662 9.31209 3.1069 8.49945 3.02531C8.2247 2.99773 8.0003 2.77646 8.0003 2.50033Z';

function Spinner() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={clsx('shrink-0', css.spinner)}
    >
      <path d={SPINNER_ARC_PATH} fill="currentColor" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Figma-style loader overlay
// ---------------------------------------------------------------------------

function FigmaStrokedLogo() {
  const s = 'rgba(255,255,255,0.9)';
  return (
    <div className={css.figmaLogoContainer}>
      {/* Top pill */}
      <svg width={22} height={12} viewBox="0 0 22 12" fill="none" className={css.figmaLogoTop}>
        <defs>
          <clipPath id="pill-clip">
            <rect x="2" y="2" width="18" height="8" rx="4" />
          </clipPath>
        </defs>
        <rect x="1" y="1" width="20" height="10" rx="5" stroke={s} strokeWidth="2" />
        <line
          x1="11" y1="1" x2="11" y2="11" stroke={s} strokeWidth="2"
          clipPath="url(#pill-clip)"
          className={css.figmaLogoMiddleLine}
        />
      </svg>
      {/* Middle petal + circle */}
      <svg width={22} height={12} viewBox="0 0 22 12" fill="none" className={css.figmaLogoMiddle}>
        <path d="M11 1V11H6C3.24 11 1 8.76 1 6C1 3.24 3.24 1 6 1H11Z" stroke={s} strokeWidth="2" />
        <circle cx="16" cy="6" r="5" stroke={s} strokeWidth="2" />
      </svg>
      {/* Bottom drip */}
      <svg width={22} height={12} viewBox="0 0 22 12" fill="none" className={css.figmaLogoBottom}>
        <path d="M6 1C3.24 1 1 3.24 1 6C1 8.76 3.24 11 6 11C8.76 11 11 8.76 11 6V1H6Z" stroke={s} strokeWidth="2" />
      </svg>
    </div>
  );
}

function FigmaLoaderOverlay({ progress }: { progress: number }) {
  return (
    <div className={clsx('absolute inset-0 flex flex-col items-center justify-center z-[1]', css.loaderOverlay)}>
      <FigmaStrokedLogo />

      {/* Progress bar with shimmer */}
      <div className={css.loaderBarTrack}>
        <div className={css.loaderBarFill} style={{ width: `${String(progress)}%` }}>
          <div className={css.loaderBarShimmer} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

const PREVIEW_DURATION_SEC = 7;

function formatTimecode(totalSec: number): string {
  const s = Math.min(Math.max(0, Math.floor(totalSec)), 99 * 60 + 59);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Card layout
// ---------------------------------------------------------------------------

interface CardLayout {
  cardWidth: number;
  cardHeight?: number;
  videoWidth: number;
  videoHeight: number;
  padding: number;
  gap: number;
  borderRadius: number;
  vertical: boolean;
}

type AspectRatio = '16:9' | '1:1' | '9:16';

const ASPECT_PRESETS: Record<AspectRatio, CardLayout> = {
  '16:9': { cardWidth: 928, cardHeight: 382, videoWidth: 618, videoHeight: 348, padding: 16, gap: 28, borderRadius: 28, vertical: false },
  '1:1':  { cardWidth: 660, cardHeight: 382, videoWidth: 350, videoHeight: 350, padding: 16, gap: 24, borderRadius: 28, vertical: false },
  '9:16': { cardWidth: 520, cardHeight: 480, videoWidth: 248, videoHeight: 448, padding: 16, gap: 28, borderRadius: 28, vertical: false },
};

const RESOLUTION_LABELS: Record<AspectRatio, string> = {
  '16:9': '1080p \u00B7 60fps \u00B7 MP4',
  '1:1':  '1080\u00D71080 \u00B7 60fps \u00B7 MP4',
  '9:16': '1080\u00D71920 \u00B7 60fps \u00B7 MP4',
};

type RenderingIndicator = 'percentage' | 'figma-loader';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ExportHeader() {
  const { trigger, modal } = ShareModal();
  const navigate = useNavigate();

  return (
    <>
      <header
        className={clsx('shrink-0 flex items-center justify-between pl-2.5 pr-2 border-b overflow-hidden', css.header)}
      >
        <div className={clsx('flex min-w-0 items-center overflow-hidden', css.headerBreadcrumbRow)}>
          <div className="flex min-w-0 items-center gap-1 shrink-0">
            <div className="flex items-center shrink-0 rounded pr-3">
              <div className="flex items-start py-1 pr-1 pl-0 -mr-2">
                <Icon24FigmaLarge />
              </div>
            </div>
            <div className="flex items-center h-full gap-2">
              <div className="flex items-center h-full">
                <div className={clsx('flex items-center h-full', css.headerBreadcrumbGap)}>
                  <ButtonPrimitive
                    className={clsx('text-bodyLgStrong text-text truncate mr-1 cursor-pointer border-0 bg-transparent p-0', css.headerBreadcrumbLabel)}
                    onClick={() => { void navigate({ to: '/' }); }}
                  >
                    {SOURCE_FILE_NAME}
                  </ButtonPrimitive>
                  <span className={clsx('text-bodyLg text-text-tertiary', css.headerSeparator)}>
                    /
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center py-1 pr-2 rounded">
                    <span className="text-bodyLgStrong text-text pl-2">
                      Export
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="lg" onClick={trigger}>
            Share
          </Button>
          <IconButton
            size="lg"
            aria-label="Close export"
            onClick={() => { void navigate({ to: '/' }); }}
          >
            <Icon24Close />
          </IconButton>
        </div>
      </header>
      {modal}
    </>
  );
}

// ---------------------------------------------------------------------------
// Hero card
// ---------------------------------------------------------------------------

function HeroCard({
  item,
  autoplayTick = 0,
  cardLayout,
  aspectRatio = '16:9',
  renderingIndicator = 'percentage',
  largeButtons = false,
}: {
  item: ExportItem | null;
  cardLayout?: CardLayout;
  aspectRatio?: AspectRatio;
  renderingIndicator?: RenderingIndicator;
  largeButtons?: boolean;
  /** Incremented when user clicks Play on a downloaded row -- main preview plays from start */
  autoplayTick?: number;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const prevItemIdRef = useRef<string | undefined>(undefined);
  const pendingAutoplayRef = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      void v.play().catch(() => setIsPlaying(false));
    } else {
      v.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTimeUpdate = () => {
      const t = v.currentTime;
      setElapsedSec(Math.min(Math.floor(t), PREVIEW_DURATION_SEC));
      if (t >= PREVIEW_DURATION_SEC) {
        v.pause();
        v.currentTime = PREVIEW_DURATION_SEC;
        setIsPlaying(false);
      }
    };
    const onCanPlay = () => {
      if (pendingAutoplayRef.current) {
        pendingAutoplayRef.current = false;
        v.currentTime = 0;
        setIsPlaying(true);
        void v.play().catch(() => setIsPlaying(false));
      }
    };
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('canplay', onCanPlay);
    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('canplay', onCanPlay);
    };
  }, [item?.id, item?.previewVideoUrl]);

  useEffect(() => {
    if (!item) return;
    const idChanged = prevItemIdRef.current !== item.id;
    prevItemIdRef.current = item.id;
    const v = videoRef.current;
    if (!v) return;
    if (idChanged) {
      pendingAutoplayRef.current = false;
      v.currentTime = 0;
      setElapsedSec(0);
      setIsPlaying(false);
    }
  }, [item]);

  useEffect(() => {
    if (autoplayTick <= 0 || !item) return;
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    setElapsedSec(0);
    setIsPlaying(true);
    void v.play().then(() => {
      pendingAutoplayRef.current = false;
    }).catch(() => {
      pendingAutoplayRef.current = true;
    });
  }, [autoplayTick, item]);

  if (!item) return null;

  const isDone = item.status === 'done';
  const isDownloading = item.status === 'downloading';
  const isRendering = !isDone && !isDownloading;

  const layout = cardLayout ?? ASPECT_PRESETS['16:9'];

  return (
    <div
      className={clsx('overflow-hidden', css.heroCard)}
      style={{
        width: layout.cardWidth,
        height: layout.cardHeight,
        borderRadius: layout.borderRadius,
      }}
    >
      <div
        className={layout.vertical ? 'flex flex-col h-full' : 'flex h-full'}
        style={{ gap: layout.gap, padding: layout.padding }}
      >
        <div
          className={clsx('shrink-0 rounded-lg overflow-hidden relative', css.heroVideoContainer)}
          style={{
            width: layout.videoWidth,
            height: layout.videoHeight,
          }}
        >
          <video
            key={item.id}
            ref={videoRef}
            src={item.previewVideoUrl}
            muted
            playsInline
            preload="metadata"
            className={clsx('absolute inset-0 w-full h-full object-cover', isRendering && css.heroVideoBlurred)}
            aria-label={item.name}
          />
          {isRendering && renderingIndicator === 'percentage' && (
            <>
              <div className="absolute inset-0 flex items-center justify-center z-[1]">
                <span className={clsx('tabular-nums', css.heroProgressPercentage)}>
                  {Math.round(item.progress)}%
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 z-[1] px-5 pb-5">
                <div className={clsx('w-full overflow-hidden', css.heroProgressTrack)}>
                  <div
                    className={css.heroProgressFill}
                    style={{ width: `${String(item.progress)}%` }}
                  />
                </div>
              </div>
            </>
          )}
          {isRendering && renderingIndicator === 'figma-loader' && (
            <FigmaLoaderOverlay progress={item.progress} />
          )}
          {!isRendering && (
            <ButtonPrimitive
              aria-label={isPlaying ? `Pause preview at ${formatTimecode(elapsedSec)}` : 'Play preview'}
              className={clsx(
                'absolute top-2 right-2 rounded cursor-pointer text-text-onbrand hover:opacity-90',
                css.overlayBg,
                isPlaying
                  ? 'h-6 min-h-6 shrink-0 flex items-center gap-1 pl-2 pr-1'
                  : 'size-6 min-w-6 min-h-6 max-w-6 max-h-6 flex items-center justify-center p-0',
              )}
              onClick={() => {
                const v = videoRef.current;
                if (isPlaying) {
                  setIsPlaying(false);
                } else {
                  if (v && Math.floor(v.currentTime) >= PREVIEW_DURATION_SEC) {
                    v.currentTime = 0;
                    setElapsedSec(0);
                  }
                  setIsPlaying(true);
                }
              }}
            >
              {isPlaying ? (
                <>
                  <span className="whitespace-nowrap tabular-nums text-center shrink-0 text-bodyMd text-text-onbrand">
                    {formatTimecode(elapsedSec)} / {formatTimecode(PREVIEW_DURATION_SEC)}
                  </span>
                  <Icon24Pause
                    className="shrink-0 size-4"
                    style={
                      {
                        '--fpl-icon-color': '#fff',
                      } as React.CSSProperties
                    }
                  />
                </>
              ) : (
                <Icon24Play
                  className="size-4"
                  style={
                    {
                      '--fpl-icon-color': '#fff',
                    } as React.CSSProperties
                  }
                />
              )}
            </ButtonPrimitive>
          )}
        </div>

        <div className="flex flex-col flex-1 py-1">
          <div className="flex flex-col gap-3 flex-1 justify-center">
            <div className="flex flex-col">
              <p className="text-headingMd text-text">
                {item.name}
              </p>
              <p className="text-bodyLg text-text-secondary">
                {RESOLUTION_LABELS[aspectRatio]}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={clsx('shrink-0 rounded-full flex items-center justify-center', css.authorAvatar)}>
                {item.author.charAt(0)}
              </div>
              <p className="text-bodyMd text-text-secondary">
                by {item.author}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isDone ? (
              <>
                <Button variant="primary" size={largeButtons ? 'lg' : 'md'} iconPrefix={<Icon24Download />} onClick={() => triggerFakeDownload(item.name)}>
                  Download
                </Button>
                <span className="text-bodyMd text-text-secondary">
                  Video rendered successfully
                </span>
              </>
            ) : isDownloading ? (
              <>
                <Button variant="primary" size={largeButtons ? 'lg' : 'md'} iconPrefix={<Icon24Download />} disabled>
                  Downloading...
                </Button>
                <span className="text-bodyMd text-text-secondary">
                  Video rendered successfully
                </span>
              </>
            ) : renderingIndicator === 'figma-loader' ? (
              <>
                <Button variant="secondary" size={largeButtons ? 'lg' : 'md'} disabled>
                  Rendering...
                </Button>
                <span className="text-bodyMd text-text-secondary">
                  {Math.round(item.progress)}% &middot; {item.timeLeftSec > 0 ? `${String(item.timeLeftSec)}s left` : 'almost done'}
                </span>
              </>
            ) : (
              <Button variant="secondary" size={largeButtons ? 'lg' : 'md'} disabled>
                Rendering...
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Queue row
// ---------------------------------------------------------------------------

const QUEUE_THUMB_FREEZE_SEC = 1;

function QueueRow({
  item,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging,
  isDropTarget,
  onPlayInMain,
  onFocusInMain,
}: {
  item: ExportItem;
  onRemove: (id: string) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
  /** Downloaded rows: play opens this video in the main hero and starts playback */
  onPlayInMain?: (item: ExportItem) => void;
  /** Click thumbnail to show this item in the main hero (status + preview), no autoplay */
  onFocusInMain?: (item: ExportItem) => void;
}) {
  const isRendering = item.status === 'rendering';
  const draggable = isRendering;
  const thumbVideoRef = useRef<HTMLVideoElement>(null);

  /** Queue + downloaded thumbs: always paused at 1s (no autoplay) */
  useEffect(() => {
    const v = thumbVideoRef.current;
    if (!v) return;
    const freeze = () => {
      try {
        v.currentTime = QUEUE_THUMB_FREEZE_SEC;
      } catch {
        /* seek may fail before metadata */
      }
      v.pause();
    };
    const onLoaded = () => freeze();
    v.addEventListener('loadeddata', onLoaded);
    v.addEventListener('loadedmetadata', onLoaded);
    if (v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) freeze();
    return () => {
      v.removeEventListener('loadeddata', onLoaded);
      v.removeEventListener('loadedmetadata', onLoaded);
    };
  }, [item.previewVideoUrl]);

  return (
    <div
      className="flex items-center justify-between py-2 w-full rounded-none"
      style={{
        opacity: isDragging ? 0.4 : 1,
        borderTop: isDropTarget ? '2px solid var(--color-bg-brand, #0d99ff)' : '2px solid transparent',
        transition: 'opacity 150ms, border-color 150ms',
      }}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
    >
      <div className="flex flex-1 gap-4 items-center min-w-0 relative">
        {draggable && (
          <span
            className="absolute -left-5 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-text-tertiary"
          >
            <Icon16DragHandle />
          </span>
        )}
        <div
          className={clsx('shrink-0 rounded overflow-hidden relative', css.queueRowThumb)}
        >
          <video
            ref={thumbVideoRef}
            src={item.previewVideoUrl}
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            aria-hidden
          />
          {onFocusInMain && (
            <ButtonPrimitive
              aria-label={`View ${item.name} in main preview`}
              className="absolute inset-0 z-[1] cursor-pointer rounded bg-transparent hover:bg-bg-hover"
              onClick={() => onFocusInMain(item)}
            >
              {null}
            </ButtonPrimitive>
          )}
          {item.status === 'done' && onPlayInMain && (
            <ButtonPrimitive
              aria-label={`Play ${item.name} in main preview`}
              className={clsx('absolute top-1 right-1 size-6 min-w-6 min-h-6 max-w-6 max-h-6 rounded flex items-center justify-center cursor-pointer p-0 text-text-onbrand hover:opacity-90 z-[2]', css.overlayBg)}
              onClick={(e) => {
                e.stopPropagation();
                onPlayInMain(item);
              }}
            >
              <Icon24Play
                className="size-4"
                style={
                  {
                    '--fpl-icon-color': '#fff',
                  } as React.CSSProperties
                }
              />
            </ButtonPrimitive>
          )}
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-bodyLg truncate text-text">
              {item.name}
            </span>
            {isRendering && <Spinner />}
            {item.status === 'done' && (
              <span className="text-text-success">
                <Icon16ApprovedCheckmark />
              </span>
            )}
          </div>
          <span className="text-bodyMd text-text-secondary">
            by {item.author}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 ml-4">
        {isRendering && (
          <span
            className="text-bodyMd text-right w-[109px] shrink-0 text-text-secondary"
          >
            {Math.round(item.progress)}% complete
          </span>
        )}
        {isRendering ? (
          <Button variant="secondary" onClick={() => onRemove(item.id)}>
            Remove
          </Button>
        ) : (
          <Button variant="secondary" iconPrefix={<Icon24Download />} onClick={() => triggerFakeDownload(item.name)}>
            Download
          </Button>
        )}
      </div>
    </div>
  );
}

function triggerFakeDownload(name: string) {
  const blob = new Blob(['fake mp4 content'], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.mp4`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

function AnimatedBackground({ paused = false }: { paused?: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div
        className={clsx('absolute', css.motionBg)}
        initial={{ opacity: 0.2 }}
        animate={paused
          ? { opacity: 0 }
          : {
              opacity: 0.2,
              x: ['0vw', '50vw', '-30vw', '75vw', '-15vw', '45vw', '10vw', '60vw', '0vw'],
              y: ['0vh', '-20vh', '30vh', '55vh', '15vh', '-10vh', '35vh', '-10vh', '0vh'],
              scale: [1, 1.05, 0.95, 1.08, 0.92, 1.02, 0.98, 1.06, 1],
            }
        }
        transition={paused
          ? { opacity: { duration: 0.8, ease: 'easeOut' } }
          : { duration: 60, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <div className={clsx('absolute', css.bgBlobBlue)} />
        <div className={clsx('absolute', css.bgBlobDark)} />
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Export Page
// ---------------------------------------------------------------------------

const DEFAULT_ASPECT_RATIO: AspectRatio = '16:9';
const DEFAULT_RENDERING_INDICATOR: RenderingIndicator = 'percentage';

function ExportPage() {
  const [, setThemeSetting] = useAppTheme({
    storageKey: 'editor-shell-theme',
    brand: 'design',
  });

  // Default to light theme for export page
  useEffect(() => {
    setThemeSetting('light');
  }, [setThemeSetting]);

  const aspectRatio = DEFAULT_ASPECT_RATIO;
  const renderingIndicator = DEFAULT_RENDERING_INDICATOR;

  const [queueItems, setQueueItems] = useState<ExportItem[]>(createInitialItems);
  const [downloadedItems, setDownloadedItems] = useState<ExportItem[]>(() => [createDownloadedItem()]);
  const [heroOverrideId, setHeroOverrideId] = useState<string | null>(null);
  const [heroAutoplayTick, setHeroAutoplayTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const renderCompleteAudio = useRef<HTMLAudioElement | null>(null);
  if (!renderCompleteAudio.current && typeof window !== 'undefined') {
    renderCompleteAudio.current = new Audio('assets/render-complete.wav');
  }

  const heroItem = (() => {
    const all = [...queueItems, ...downloadedItems];
    if (heroOverrideId) {
      const found = all.find((i) => i.id === heroOverrideId);
      if (found) return found;
    }
    return queueItems[0] ?? downloadedItems[0] ?? null;
  })();

  useEffect(() => {
    if (!heroOverrideId) return;
    const all = [...queueItems, ...downloadedItems];
    if (!all.some((i) => i.id === heroOverrideId)) {
      setHeroOverrideId(null);
    }
  }, [heroOverrideId, queueItems, downloadedItems]);

  const handlePlayInMain = useCallback((item: ExportItem) => {
    setHeroOverrideId(item.id);
    setHeroAutoplayTick((t) => t + 1);
  }, []);

  const handleFocusInMain = useCallback((item: ExportItem) => {
    setHeroOverrideId(item.id);
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setQueueItems((prev) => {
        const updated = prev.map((item) => {
          if (item.status !== 'rendering') return item;
          const newProgress = Math.min(item.progress + (1.5 + Math.random() * 1.5), 100);
          const newTimeLeft = Math.max(0, item.timeLeftSec - 1);
          if (newProgress >= 100) {
            return { ...item, progress: 100, timeLeftSec: 0, status: 'downloading' as const };
          }
          return { ...item, progress: newProgress, timeLeftSec: newTimeLeft };
        });

        const nowDone = updated.filter((i) => i.status === 'downloading');
        if (nowDone.length > 0) {
          setTimeout(() => {
            setQueueItems((q) => {
              const finishing = q.filter((i) => i.status === 'downloading');
              const rest = q.filter((i) => i.status !== 'downloading');
              if (finishing.length > 0) {
                const justFinishedId = finishing[0].id;
                setDownloadedItems((d) => [
                  ...finishing.map((i) => ({ ...i, status: 'done' as const })),
                  ...d,
                ]);
                setHeroOverrideId(justFinishedId);
                setHeroAutoplayTick((t) => t + 1);
                const audio = renderCompleteAudio.current;
                if (audio) {
                  audio.currentTime = 0;
                  audio.play().catch(() => {/* ignore autoplay restrictions */});
                }
              }
              return rest;
            });
          }, 2000);
        }

        return updated;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleRemove = useCallback((id: string) => {
    setQueueItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const handleDragStart = useCallback((id: string) => (e: React.DragEvent) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragId) setDropTargetId(id);
  }, [dragId]);

  const handleDrop = useCallback((targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;
    setQueueItems((prev) => {
      const items = [...prev];
      const fromIdx = items.findIndex((i) => i.id === dragId);
      const toIdx = items.findIndex((i) => i.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      return items;
    });
    setDragId(null);
    setDropTargetId(null);
  }, [dragId]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDropTargetId(null);
  }, []);

  const renderingItems = queueItems.filter((i) => i.status === 'rendering' || i.status === 'downloading');

  const bgPaused = heroItem?.status === 'done';

  return (
    <div className={clsx('h-screen w-screen flex flex-col overflow-hidden relative', css.exportPage)}>
      <ExportHeader />

      <div
        className={clsx('fixed left-0 right-0 bottom-0 pointer-events-none overflow-hidden', css.bgContainer)}
        aria-hidden
      >
        <AnimatedBackground paused={bgPaused} />
      </div>

      <div className="flex-1 relative z-[1] min-h-0 overflow-y-auto">
        <div className={clsx('relative flex flex-col items-center gap-4', css.contentArea)}>
          <HeroCard
            item={heroItem}
            autoplayTick={heroAutoplayTick}
            aspectRatio={aspectRatio}
            renderingIndicator={renderingIndicator}
          />

          <div className="w-[580px] flex flex-col gap-2">
            {renderingItems.length > 0 && (
              <div className="flex flex-col gap-1 px-4 py-2">
                <span className="text-bodyMd text-text">
                  Videos in the queue
                </span>
                <div className="flex flex-col">
                  {renderingItems.map((item) => (
                    <QueueRow
                      key={item.id}
                      item={item}
                      onRemove={handleRemove}
                      onDragStart={handleDragStart(item.id)}
                      onDragOver={handleDragOver(item.id)}
                      onDrop={handleDrop(item.id)}
                      onDragEnd={handleDragEnd}
                      isDragging={dragId === item.id}
                      isDropTarget={dropTargetId === item.id}
                      onFocusInMain={handleFocusInMain}
                    />
                  ))}
                </div>
              </div>
            )}

            {downloadedItems.length > 0 && (
              <div className="flex flex-col gap-1 px-4 py-2">
                <span className="text-bodyMd text-text">
                  Downloaded
                </span>
                <div className="flex flex-col">
                  {downloadedItems.map((item) => (
                    <QueueRow
                      key={item.id}
                      item={item}
                      onRemove={handleRemove}
                      onPlayInMain={handlePlayInMain}
                      onFocusInMain={handleFocusInMain}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/export')({
  component: ExportPage,
});
