import type { ScriptStep } from '@prototype/shared';

/* ------------------------------------------------------------------ */
/*  Mock content for write-file steps                                    */
/* ------------------------------------------------------------------ */

const WORKSHOP_AGENDA_CONTENT = `# Product Strategy Workshop — Agenda

## Session 1: Discovery (45 min)
- **10:00–10:15** — Opening & icebreaker
- **10:15–10:45** — Review customer research findings
  - Top pain points from Q4 survey
  - Competitive landscape overview

## Session 2: Ideation (60 min)
- **10:45–11:15** — "How might we…" brainstorm (silent writing)
- **11:15–11:45** — Dot-voting & theme clustering

## Break (15 min)

## Session 3: Prioritization (45 min)
- **12:00–12:20** — Impact/Effort matrix exercise
- **12:20–12:45** — Stack-rank top 5 initiatives

## Session 4: Next Steps (30 min)
- **12:45–13:00** — Assign owners & set deadlines
- **13:00–13:15** — Wrap-up & parking lot review`;

const ACTION_ITEMS_CONTENT = `# Action Items

| # | Action | Owner | Due | Status |
|---|--------|-------|-----|--------|
| 1 | Finalize customer journey map from discovery notes | @sarah | Mar 7 | To do |
| 2 | Draft one-pager for top-voted initiative | @james | Mar 10 | To do |
| 3 | Schedule eng feasibility review for top 3 ideas | @priya | Mar 7 | To do |
| 4 | Share competitive analysis deck with wider team | @sarah | Mar 5 | To do |
| 5 | Set up bi-weekly sync for initiative tracking | @james | Mar 12 | To do |

## Parking Lot
- Revisit pricing model after Q1 results are in
- Explore partnership opportunity raised by @alex
- Plan follow-up workshop for detailed roadmap mapping`;

/* ------------------------------------------------------------------ */
/*  Default script – workshop organization scenario                     */
/* ------------------------------------------------------------------ */

export const DEFAULT_SCRIPT: ScriptStep[] = [
  // 1. Working indicator
  { type: 'progress', label: 'Reviewing workshop content...', duration: 4000 },

  // 2. Reasoning
  {
    type: 'reasoning',
    content:
      "I can see a collection of sticky notes from a product strategy workshop. The notes cover discovery findings, brainstorm ideas, and prioritization votes. I'll organize these into a structured agenda with clear time blocks and then extract concrete action items with owners and deadlines based on the wrap-up notes.",
  },

  // 3. AI communicates plan
  {
    type: 'ai-message',
    content:
      "I'll organize your workshop notes into a structured agenda and clear action items. Let me review the board first.",
  },

  // 4. Viewing files
  { type: 'view-file', fileName: 'Workshop Notes.figjam', duration: 3000 },

  // 5. Todo list
  {
    type: 'todo-list',
    tasks: [
      'Create structured workshop agenda',
      'Define action items with owners and deadlines',
    ],
  },

  // 6–8. First task – Workshop Agenda
  { type: 'start-task', taskIndex: 0 },
  { type: 'write-file', fileName: 'Workshop-Agenda.md', code: WORKSHOP_AGENDA_CONTENT },
  { type: 'complete-task', taskIndex: 0, files: ['Workshop-Agenda.md'] },

  // 9–11. Second task – Action Items
  { type: 'start-task', taskIndex: 1 },
  { type: 'write-file', fileName: 'Action-Items.md', code: ACTION_ITEMS_CONTENT },
  { type: 'complete-task', taskIndex: 1, files: ['Action-Items.md'] },

  // 12. AI summary
  {
    type: 'ai-message',
    content:
      "All organized! I've created a structured workshop agenda with four sessions and time blocks, plus a detailed action items table with owners and deadlines. The parking lot items from the wrap-up are captured too.",
  },

  // 13. Version
  { type: 'version', label: 'Organize workshop plan' },

  // 14. Rating
  { type: 'rating' },

  // 15. Done
  { type: 'done' },
];
