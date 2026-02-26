import { useId } from 'react';

interface HighlighterIllustrationProps {
  color?: string;
  className?: string;
}

/**
 * Highlighter illustration — a wider, flatter marker variant with a chisel tip.
 * The `color` prop replaces the barrel fill.
 */
export function HighlighterIllustration({ color = '#A5A5A5', className }: HighlighterIllustrationProps) {
  const id = useId();

  return (
    <svg
      width="32"
      height="52"
      viewBox="0 0 32 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g filter={`url(#${id}-filter0)`}>
        {/* Barrel body — wider than marker */}
        <path
          d="M7 14C7 12.8954 7.89543 12 9 12H23C24.1046 12 25 12.8954 25 14V64H7V14Z"
          fill="var(--color-bg)"
        />
        <path
          d="M7 14C7 12.8954 7.89543 12 9 12H23C24.1046 12 25 12.8954 25 14V64H7V14Z"
          fill={`url(#${id}-paint0)`}
          fillOpacity="0.6"
        />
        <path
          d="M9 12.25H23C23.8284 12.25 24.75 13.0716 24.75 14V63.75H7.25V14C7.25 13.0716 8.17157 12.25 9 12.25Z"
          stroke="black"
          strokeOpacity="0.3"
          strokeWidth="0.5"
        />
        {/* Chisel tip */}
        <path
          d="M10 12L13 2H19L22 12H10Z"
          fill={color}
        />
        <path
          d="M10.3 11.75L13.15 2.25H18.85L21.7 11.75H10.3Z"
          stroke="black"
          strokeOpacity="0.3"
          strokeWidth="0.5"
        />
        {/* Band */}
        <path d="M7.5 30H24.5" stroke="black" strokeOpacity="0.15" />
        <path opacity="0.5" d="M7.5 31H24.5" stroke="white" />
      </g>
      <defs>
        <filter
          id={`${id}-filter0`}
          x="0"
          y="-2"
          width="32"
          height="72"
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
          <feGaussianBlur stdDeviation="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="2" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0" />
          <feBlend mode="normal" in2="effect1" result="effect2" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect2" result="shape" />
        </filter>
        <linearGradient
          id={`${id}-paint0`}
          x1="7"
          y1="53.5"
          x2="25"
          y2="53.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopOpacity="0.1" />
          <stop offset="0.4" stopOpacity="0" />
          <stop offset="1" stopOpacity="0.15" />
        </linearGradient>
      </defs>
    </svg>
  );
}
