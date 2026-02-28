import type { MultiplayerColor } from '../Avatar';

export interface UserConfig {
  name: string;
  avatarUrl?: string;
  color?: MultiplayerColor;
}
