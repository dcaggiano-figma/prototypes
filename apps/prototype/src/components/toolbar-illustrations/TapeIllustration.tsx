import { useId } from 'react';

interface TapeIllustrationProps {
  className?: string;
}

/**
 * Simplified vector-only tape illustration.
 * The original has embedded raster/foreignObject that's too heavy for inline use.
 * This captures the zigzag-edge body and dispenser shape.
 */
export function TapeIllustration({ className }: TapeIllustrationProps) {
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
        {/* Tape roll body */}
        <rect x="6" y="8" width="20" height="48" rx="3" fill="#E8E8E8" />
        <rect
          x="6.25"
          y="8.25"
          width="19.5"
          height="47.5"
          rx="2.75"
          stroke="black"
          strokeOpacity="0.15"
          strokeWidth="0.5"
        />

        {/* Center hole */}
        <circle cx="16" cy="28" r="5" fill="white" />
        <circle cx="16" cy="28" r="4.75" stroke="black" strokeOpacity="0.1" strokeWidth="0.5" />

        {/* Tape band color ring */}
        <circle cx="16" cy="28" r="8" stroke="#C4C4C4" strokeWidth="3" fill="none" />

        {/* Top zigzag tear edge */}
        <path
          d="M6 12L8.5 10L11 12L13.5 10L16 12L18.5 10L21 12L23.5 10L26 12"
          stroke="#C4C4C4"
          strokeWidth="0.75"
          strokeLinejoin="round"
        />

        {/* Dispenser handle */}
        <path
          d="M10 8V4C10 2.89543 10.8954 2 12 2H20C21.1046 2 22 2.89543 22 4V8"
          fill="#D4D4D4"
        />
        <path
          d="M10.25 8V4C10.25 3.03351 11.0335 2.25 12 2.25H20C20.9665 2.25 21.75 3.03351 21.75 4V8"
          stroke="black"
          strokeOpacity="0.15"
          strokeWidth="0.5"
        />
      </g>

      <defs>
        <filter
          id={`${id}-filter0`}
          x="0"
          y="-2"
          width="32"
          height="64"
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
      </defs>
    </svg>
  );
}
