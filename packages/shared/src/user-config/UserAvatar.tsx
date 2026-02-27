import { Avatar } from '../Avatar';
import { useUserConfig } from './provider';

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xlg';
}

export function UserAvatar({ size = 'md' }: UserAvatarProps) {
  const { config, initial } = useUserConfig();
  return (
    <Avatar
      size={size}
      src={config.avatarUrl}
      initial={initial}
      alt={config.name}
    />
  );
}
