import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './skeleton.module.css';

export type SkeletonVariant = 'icon' | 'avatar' | 'text' | 'heading' | 'thumbnail';
export type SkeletonSize = 'sm' | 'md' | 'lg';

export interface SkeletonProps {
  children: ReactNode;
  className?: string;
}

export interface BoneProps {
  variant?: SkeletonVariant;
  size?: SkeletonSize;
  width?: number | string;
  height?: number | string;
  className?: string;
}

const SIZE_MAP: Record<SkeletonVariant, Record<SkeletonSize, { w: number | string; h: number }>> = {
  icon: {
    sm: { w: 16, h: 16 },
    md: { w: 24, h: 24 },
    lg: { w: 32, h: 32 },
  },
  avatar: {
    sm: { w: 16, h: 16 },
    md: { w: 24, h: 24 },
    lg: { w: 32, h: 32 },
  },
  text: {
    sm: { w: '100%', h: 9 },
    md: { w: '100%', h: 11 },
    lg: { w: '100%', h: 13 },
  },
  heading: {
    sm: { w: '100%', h: 13 },
    md: { w: '100%', h: 16 },
    lg: { w: '100%', h: 19 },
  },
  thumbnail: {
    sm: { w: 32, h: 32 },
    md: { w: 48, h: 48 },
    lg: { w: 64, h: 64 },
  },
};

function SkeletonRoot({ children, className }: SkeletonProps) {
  return (
    <div className={clsx(styles.skeleton, className)} aria-live="polite" aria-busy="true">
      {children}
    </div>
  );
}

function Bone({
  variant = 'text',
  size = 'md',
  width,
  height,
  className,
}: BoneProps) {
  const defaults = SIZE_MAP[variant][size];
  const resolvedWidth = width ?? defaults.w;
  const resolvedHeight = height ?? defaults.h;
  return (
    <div
      className={clsx(
        'shrink-0',
        variant === 'avatar' ? 'rounded-full' : 'rounded-md',
        styles.bone,
        className,
      )}
      style={{
        width: typeof resolvedWidth === 'number' ? `${resolvedWidth}px` : resolvedWidth,
        height: typeof resolvedHeight === 'number' ? `${resolvedHeight}px` : resolvedHeight,
      }}
    />
  );
}

export const Skeleton = Object.assign(SkeletonRoot, { Bone });
