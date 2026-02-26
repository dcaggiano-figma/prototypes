import { useId } from 'react';

interface MarkerIllustrationProps {
  color?: string;
  className?: string;
}

export function MarkerIllustration({ color = '#A5A5A5', className }: MarkerIllustrationProps) {
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
        {/* Marker barrel body */}
        <path
          d="M9.99331 11.2472C10.2996 10.4932 11.0324 10 11.8462 10H20.1538C20.9676 10 21.7004 10.4932 22.0067 11.2472L26.8235 23.1039C27.6005 25.0166 28 27.0615 28 29.1259V64H4L4 29.1259C4 27.0615 4.39952 25.0166 5.17653 23.1039L9.99331 11.2472Z"
          fill="var(--color-bg"
        />
        {/* Side shading gradient overlay */}
        <path
          d="M9.99331 11.2472C10.2996 10.4932 11.0324 10 11.8462 10H20.1538C20.9676 10 21.7004 10.4932 22.0067 11.2472L26.8235 23.1039C27.6005 25.0166 28 27.0615 28 29.1259V64H4L4 29.1259C4 27.0615 4.39952 25.0166 5.17653 23.1039L9.99331 11.2472Z"
          fill={`url(#${id}-paint0)`}
          fillOpacity="0.6"
        />
        {/* Barrel outline */}
        <path
          d="M11.8467 10.25H20.1533C20.8655 10.25 21.5074 10.682 21.7754 11.3418L26.5918 23.1982C27.3566 25.0809 27.75 27.0938 27.75 29.126V63.75H4.25V29.126C4.25 27.0938 4.64338 25.0809 5.4082 23.1982L10.2246 11.3418C10.4926 10.682 11.1345 10.25 11.8467 10.25Z"
          stroke="black"
          strokeOpacity="0.3"
          strokeWidth="0.5"
        />
        {/* Right-side highlight */}
        <g opacity="0.4" filter={`url(#${id}-filter1)`}>
          <path
            d="M26 27.134V62.634H16.5V11.634L20 11.5L26 27.134Z"
            fill={`url(#${id}-paint1)`}
          />
        </g>
        {/* Marker tip */}
        <g filter={`url(#${id}-filter2)`}>
          <path
            d="M15.0745 1.76245C15.4134 0.93396 16.5866 0.933959 16.9255 1.76245L20.5 10.5H11.5L15.0745 1.76245Z"
            fill={color}
          />
        </g>
        {/* Tip outline */}
        <path
          d="M15.3057 1.85742C15.5599 1.23605 16.4401 1.23606 16.6943 1.85742L20.1279 10.25H11.8721L15.3057 1.85742Z"
          stroke="black"
          strokeOpacity="0.3"
          strokeWidth="0.5"
        />
        {/* Band line */}
        <path d="M4.5 32H27.5" stroke="black" strokeOpacity="0.15" />
        <path opacity="0.5" d="M4.5 33H27.5" stroke="white" />
      </g>
      <defs>
        {/* Outer drop shadow */}
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
        {/* Right-side blur */}
        <filter
          id={`${id}-filter1`}
          x="13.5"
          y="8.5"
          width="15.5"
          height="57.134"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="1.5" result="effect1" />
        </filter>
        {/* Tip inner shadow */}
        <filter
          id={`${id}-filter2`}
          x="9.34"
          y="1.14105"
          width="11.16"
          height="10.4389"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx="-2.16" dy="1.08" />
          <feGaussianBlur stdDeviation="1.62" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0" />
          <feBlend mode="normal" in2="shape" result="effect1" />
        </filter>
        {/* Side shading gradient */}
        <linearGradient
          id={`${id}-paint0`}
          x1="4"
          y1="53.5"
          x2="28"
          y2="53.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopOpacity="0.1" />
          <stop offset="0.4" stopOpacity="0" />
          <stop offset="1" stopOpacity="0.15" />
        </linearGradient>
        {/* Right highlight gradient */}
        <linearGradient
          id={`${id}-paint1`}
          x1="16.5"
          y1="-1.5"
          x2="23.7558"
          y2="50.4928"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopOpacity="0.2" />
          <stop offset="1" stopOpacity="0.4" />
        </linearGradient>
      </defs>
    </svg>
  );
}
