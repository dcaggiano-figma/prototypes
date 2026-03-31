import { AiClient } from '@figma/ppg-ai';

export const aiClient = new AiClient();

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export function resolveModel(modelValue: string): string {
  if (modelValue === 'default') return DEFAULT_MODEL;
  return modelValue;
}
