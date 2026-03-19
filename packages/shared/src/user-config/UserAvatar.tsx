import { Avatar, type MultiplayerColor } from '../avatar/Avatar';
import { useUserConfig } from './provider';

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xlg';
  color?: MultiplayerColor;
}

export function UserAvatar({ size = 'md', color }: UserAvatarProps) {
  const { config, initial } = useUserConfig();
  return (
    <Avatar
      size={size}
      src={config.avatarUrl}
      initial={initial}
      alt={config.name}
      color={color ?? config.color}
    />
  );
}
