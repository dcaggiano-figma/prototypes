import { useId } from 'react';

interface ShapeSubProps {
  className?: string;
}

// ---------------------------------------------------------------------------
// Shared shadow filter definition (3-layer drop shadow matching original)
// ---------------------------------------------------------------------------

function ShadowFilter({ id, x, y, width, height }: { id: string; x: number; y: number; width: number; height: number }) {
  return (
    <filter
      id={id}
      x={x}
      y={y}
      width={width}
      height={height}
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
  );
}

// ---------------------------------------------------------------------------
// Connector (top-right arrow)
// ---------------------------------------------------------------------------

export function ShapeConnector({ className }: ShapeSubProps) {
  const id = useId();

  return (
    <svg
      width="28"
      height="21"
      viewBox="29 0 28 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <ShadowFilter id={`${id}-f`} x={26} y={-5} width={40} height={40} />
      </defs>
      <g filter={`url(#${id}-f)`}>
        <path
          d="M38 20.4999C38.2761 20.4999 38.5 20.276 38.5 19.9999C38.5 16.6947 41.1793 14.0157 44.4844 14.0155H52.2891L49.1475 17.1454C48.952 17.3402 48.9509 17.6568 49.1455 17.8524C49.3403 18.0479 49.6569 18.0489 49.8525 17.8544L53.8525 13.87C53.9464 13.7765 53.9997 13.649 54 13.5165C54.0003 13.3839 53.9481 13.2559 53.8545 13.162L49.8545 9.14734C49.6597 8.95183 49.3431 8.95088 49.1475 9.14539C48.9519 9.34028 48.9506 9.65777 49.1455 9.85339L52.2949 13.0155H44.4844C40.627 13.0157 37.5 16.1424 37.5 19.9999C37.5 20.276 37.7239 20.4999 38 20.4999Z"
          fill="#757575"
        />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Rectangle (left)
// ---------------------------------------------------------------------------

export function ShapeRectangle({ className }: ShapeSubProps) {
  const id = useId();

  return (
    <svg
      width="26"
      height="31"
      viewBox="0 8 26 31"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <ShadowFilter id={`${id}-f`} x={0} y={8} width={34} height={34} />
      </defs>
      <g filter={`url(#${id}-f)`}>
        <path
          d="M8 15C8 13.8954 8.89543 13 10 13H24C25.1046 13 26 13.8954 26 15V29C26 30.1046 25.1046 31 24 31H10C8.89543 31 8 30.1046 8 29V15Z"
          fill="white"
        />
        <path
          d="M10 13.5H24C24.8284 13.5 25.5 14.1716 25.5 15V29C25.5 29.8284 24.8284 30.5 24 30.5H10C9.17157 30.5 8.5 29.8284 8.5 29V15C8.5 14.1716 9.17157 13.5 10 13.5Z"
          stroke="#757575"
        />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Circle (bottom-right)
// ---------------------------------------------------------------------------

export function ShapeCircle({ className }: ShapeSubProps) {
  const id = useId();

  return (
    <svg
      width="36"
      height="36"
      viewBox="27 22 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <ShadowFilter id={`${id}-f`} x={27} y={22} width={36} height={36} />
      </defs>
      <g filter={`url(#${id}-f)`}>
        <circle cx="45" cy="37" r="10" fill="white" />
        <circle cx="45" cy="37" r="9.5" stroke="#757575" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Composed full illustration (all three shapes)
// ---------------------------------------------------------------------------

export type HoveredShape = 'rectangle' | 'connector' | 'circle' | null;

interface ShapesIllustrationProps {
  className?: string;
  hoveredShape?: HoveredShape;
}

export function ShapesIllustration({ className, hoveredShape }: ShapesIllustrationProps) {
  const id = useId();

  const scaleStyle = (
    shape: HoveredShape,
    originX: number,
    originY: number,
  ): React.CSSProperties => ({
    transform: hoveredShape === shape ? 'scale(1.25)' : 'scale(1)',
    transformOrigin: `${originX}px ${originY}px`,
    transition: 'transform 200ms ease-out',
  });

  return (
    <svg
      width="64"
      height="54"
      viewBox="0 0 64 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath={`url(#${id}-clip)`}>
        {/* Connector arrow (top-right) */}
        <g
          filter={`url(#${id}-filter0)`}
          style={scaleStyle('connector', 46, 15)}
        >
          <path
            d="M38 20.4999C38.2761 20.4999 38.5 20.276 38.5 19.9999C38.5 16.6947 41.1793 14.0157 44.4844 14.0155H52.2891L49.1475 17.1454C48.952 17.3402 48.9509 17.6568 49.1455 17.8524C49.3403 18.0479 49.6569 18.0489 49.8525 17.8544L53.8525 13.87C53.9464 13.7765 53.9997 13.649 54 13.5165C54.0003 13.3839 53.9481 13.2559 53.8545 13.162L49.8545 9.14734C49.6597 8.95183 49.3431 8.95088 49.1475 9.14539C48.9519 9.34028 48.9506 9.65777 49.1455 9.85339L52.2949 13.0155H44.4844C40.627 13.0157 37.5 16.1424 37.5 19.9999C37.5 20.276 37.7239 20.4999 38 20.4999Z"
            fill="#757575"
          />
        </g>

        {/* Rectangle (left) */}
        <g
          filter={`url(#${id}-filter1)`}
          style={scaleStyle('rectangle', 17, 22)}
        >
          <path
            d="M8 15C8 13.8954 8.89543 13 10 13H24C25.1046 13 26 13.8954 26 15V29C26 30.1046 25.1046 31 24 31H10C8.89543 31 8 30.1046 8 29V15Z"
            fill="white"
          />
          <path
            d="M10 13.5H24C24.8284 13.5 25.5 14.1716 25.5 15V29C25.5 29.8284 24.8284 30.5 24 30.5H10C9.17157 30.5 8.5 29.8284 8.5 29V15C8.5 14.1716 9.17157 13.5 10 13.5Z"
            stroke="#757575"
          />
        </g>

        {/* Circle (bottom-right) */}
        <g
          filter={`url(#${id}-filter2)`}
          style={scaleStyle('circle', 45, 37)}
        >
          <circle cx="45" cy="37" r="10" fill="white" />
          <circle cx="45" cy="37" r="9.5" stroke="#757575" />
        </g>
      </g>

      <defs>
        <ShadowFilter id={`${id}-filter0`} x={26} y={-5} width={40} height={40} />
        <ShadowFilter id={`${id}-filter1`} x={0} y={8} width={34} height={34} />
        <ShadowFilter id={`${id}-filter2`} x={27} y={22} width={36} height={36} />

        <clipPath id={`${id}-clip`}>
          <rect width="64" height="54" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
