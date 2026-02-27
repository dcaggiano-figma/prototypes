import type { ComponentType } from 'react';
import { IconButton } from '@figma/fpl-components';

interface FlatToolButtonProps {
  icon: ComponentType;
  label: string;
  isActive: boolean;
  secondary?: boolean;
  onClick: () => void;
}

export function FlatToolButton({
  icon: Icon,
  label,
  isActive,
  secondary,
  onClick,
}: FlatToolButtonProps) {
  return (
    <IconButton
      size="lg"
      aria-label={label}
      variant={isActive && !secondary ? 'primary' : secondary ? 'secondary' : 'ghost'}
      onClick={onClick}
    >
      <Icon />
    </IconButton>
  );
}
