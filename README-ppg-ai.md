# @figma/ppg-ai

A client for making Claude API calls from prototypes, proxied through a Supabase edge function. Auth is handled via a baked-in Supabase anon key — no configuration needed.

## Installation

Already included as a dependency in all templates and the prototype app. Just import it:

```ts
import { AiClient } from '@figma/ppg-ai';
```

## API Reference

### `AiClient`

```ts
const client = new AiClient();
```

The main class. Instantiate with no arguments. Exposes a single namespace:

- `client.messages.create(params)` — mirrors the Anthropic Messages API

### `MessageCreateParams`

| Field | Type | Required | Description |
|---|---|---|---|
| `model` | `string` | Yes | Model ID (e.g. `'claude-sonnet-4-20250514'`) |
| `max_tokens` | `number` | Yes | Maximum tokens in response |
| `messages` | `Array<{ role: 'user' \| 'assistant'; content: string \| ContentBlock[] }>` | Yes | Conversation messages |
| `system` | `string` | No | System prompt |
| `stream` | `boolean` | No | Enable streaming (default `false`) |
| `temperature` | `number` | No | Temperature parameter |
| `top_p` | `number` | No | Top-P parameter |
| `stop_sequences` | `string[]` | No | Stop sequences |

### `Message` (response)

```ts
interface Message {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ContentBlock[];  // TextBlock | ToolUseBlock
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: { input_tokens: number; output_tokens: number };
}
```

### Content blocks

```ts
interface TextBlock {
  type: 'text';
  text: string;
}

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

type ContentBlock = TextBlock | ToolUseBlock;
```

### Streaming

Pass `stream: true` to get an `AsyncIterable<StreamEvent>`. Event types:

| Event | Key fields |
|---|---|
| `message_start` | `message: Message` |
| `content_block_start` | `index`, `content_block: ContentBlock` |
| `content_block_delta` | `index`, `delta: { type: 'text_delta'; text: string }` |
| `content_block_stop` | `index` |
| `message_delta` | `delta: { stop_reason, stop_sequence }`, `usage: { output_tokens }` |
| `message_stop` | _(terminal event)_ |

### Error classes

- **`AuthError`** — authentication/authorization failure
- **`RateLimitError`** — rate limit exceeded

### Rate limits

- **Client-side**: 10 requests per 5 seconds
- **Server-side**: 100 requests per 5 minutes

## Usage Examples

### Basic request

```ts
import { AiClient } from '@figma/ppg-ai';

const client = new AiClient();

const message = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Summarize this text: ...' }],
});

const text = message.content
  .filter((block) => block.type === 'text')
  .map((block) => block.text)
  .join('');
```

### Streaming

```ts
import { AiClient } from '@figma/ppg-ai';

const client = new AiClient();

const stream = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Write a short story.' }],
  stream: true,
});

let result = '';
for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    result += event.delta.text;
    // Update your UI with the new text, e.g.:
    // setResponse(result);
  }
}
```

## Exported Types

```ts
import type {
  MessageCreateParams,
  Message,
  ContentBlock,
  TextBlock,
  ToolUseBlock,
  StreamEvent,
  MessageStartEvent,
  ContentBlockStartEvent,
  ContentBlockDeltaEvent,
  TextDelta,
  ContentBlockStopEvent,
  MessageDeltaEvent,
  MessageStopEvent,
} from '@figma/ppg-ai';
```
