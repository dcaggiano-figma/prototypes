# Prototype Instructions

This prototype uses FPL components. See the root `.claude/instructions/fpl/` for component documentation.

## Simulating a Conversation (Chat Panel)

The chat panel is driven by a **script** — an ordered array of steps that play out automatically to simulate an AI conversation.

### Key file: `src/data/chatScript.ts`

Edit `DEFAULT_SCRIPT` to define the conversation sequence. Each step is a `ScriptStep`:

```ts
{ type: 'progress', label: 'Analyzing...', duration: 3000 }   // Spinner
{ type: 'reasoning', content: 'I need to...' }                 // Collapsible thinking
{ type: 'ai-message', content: 'Here is my response.' }        // AI chat bubble
{ type: 'view-file', fileName: 'App.tsx', duration: 2000 }     // File read indicator
{ type: 'todo-list', tasks: ['Task A', 'Task B'] }             // Task checklist
{ type: 'start-task', taskIndex: 0 }                           // Begin a task
{ type: 'write-file', fileName: 'App.tsx', code: '...' }       // File write indicator
{ type: 'complete-task', taskIndex: 0, files: ['App.tsx'] }     // Mark task done
{ type: 'version', label: 'v1' }                               // Version card
{ type: 'rating' }                                             // Thumbs up/down
{ type: 'done' }                                               // End of script
```

Steps play in order. The hook `useChatScript` (in `src/hooks/useChatScript.ts`) processes each step, dispatches state updates, and drives animations.

### Other relevant files

| File | Purpose |
|------|---------|
| `src/components/ChatPanel.tsx` | Renders the message list and prompt input |
| `src/components/ChatMessage.tsx` | Individual message bubble (`sender: 'user' \| 'ai'`) |
| `src/hooks/useChatScript.ts` | Reducer + step processor that converts script steps into chat items |
| `src/helpers/workingState.tsx` | Global state context; stores completed conversations and active script |
| `src/types.ts` | `Attachment`, `InspectedElement`, `PromptSubmission` types |
