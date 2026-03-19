import type { MultiplayerColor } from '../avatar/Avatar';

export interface UserConfig {
  name: string;
  avatarUrl?: string;
  color?: MultiplayerColor;
}
