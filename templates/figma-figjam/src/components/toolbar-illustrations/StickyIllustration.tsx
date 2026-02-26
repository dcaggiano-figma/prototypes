import { useId } from 'react';

interface StickyIllustrationProps {
  color?: string;
  className?: string;
  topLifted?: boolean;
}

/**
 * Three-sticky-stack illustration. When `topLifted` is true, the top sticky
 * note lifts upward via an inline transform — the bottom two stay in place.
 */
export function StickyIllustration({ color = '#FFE299', className, topLifted }: StickyIllustrationProps) {
  const id = useId();

  return (
    <svg
      width="64"
      height="48"
      viewBox="0 0 64 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath={`url(#${id}-clip)`}>
        {/* Bottom sticky (most rotated) */}
        <g filter={`url(#${id}-filter0)`}>
          <path
            d="M5 25.3127L38.8289 13L51.1417 46.829L17.3127 59.1417L5 25.3127Z"
            fill={color}
          />
          <path
            d="M5 25.3127L38.8289 13L51.1417 46.829L17.3127 59.1417L5 25.3127Z"
            fill="black"
            fillOpacity="0.08"
          />
        </g>

        {/* Middle sticky (slightly rotated) */}
        <g filter={`url(#${id}-filter1)`}>
          <path
            d="M10 16.8717L47.4227 10.2731L54.0213 47.6958L16.5986 54.2944L10 16.8717Z"
            fill={color}
          />
          <path
            d="M10 16.8717L47.4227 10.2731L54.0213 47.6958L16.5986 54.2944L10 16.8717Z"
            fill="black"
            fillOpacity="0.05"
          />
        </g>

        {/* Top sticky — lifts when topLifted is true */}
        <g
          filter={`url(#${id}-filter2)`}
          style={{
            transform: topLifted ? 'translateY(-4px)' : 'translateY(0)',
            transition: 'transform var(--duration-md) ease-out',
          }}
        >
          <path d="M16 4H60V48H16V4Z" fill={color} />
        </g>
      </g>

      <defs>
        {/* Bottom sticky shadow */}
        <filter
          id={`${id}-filter0`}
          x="-3"
          y="8"
          width="62.1426"
          height="62.1417"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="1" />
          <feGaussianBlur stdDeviation="1.5" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="3" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
          <feBlend mode="normal" in2="effect1" result="effect2" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="0.25" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.18 0" />
          <feBlend mode="normal" in2="effect2" result="effect3" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect3" result="shape" />
        </filter>

        {/* Middle sticky shadow */}
        <filter
          id={`${id}-filter1`}
          x="2"
          y="5.27307"
          width="60.0215"
          height="60.0214"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="1" />
          <feGaussianBlur stdDeviation="1.5" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="3" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
          <feBlend mode="normal" in2="effect1" result="effect2" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="0.25" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.18 0" />
          <feBlend mode="normal" in2="effect2" result="effect3" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect3" result="shape" />
        </filter>

        {/* Top sticky shadow */}
        <filter
          id={`${id}-filter2`}
          x="8"
          y="-1"
          width="60"
          height="60"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="1" />
          <feGaussianBlur stdDeviation="1.5" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="3" />
          <feGaussianBlur stdDeviation="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
          <feBlend mode="normal" in2="effect1" result="effect2" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="0.25" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.18 0" />
          <feBlend mode="normal" in2="effect2" result="effect3" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect3" result="shape" />
        </filter>

        <clipPath id={`${id}-clip`}>
          <rect width="64" height="48" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
