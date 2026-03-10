# AI Prototyping Playground

High-fidelity UI prototypes for demonstrating user experiences and interactions, built with Figma's design system.

## Getting Started

See the [Prototyping Playground Notion doc](https://www.notion.so/figma/Prototyping-Playground-30fb8b1f837c80a79626e8adc2b27c9a) for setup instructions, walkthroughs, and troubleshooting.

## Project Structure

```text
/
├── templates/               # Prototype templates
│   ├── blank_slate/         # Minimal starting point
│   ├── browser-shell/       # Sidebar-navigation layout
│   ├── eval-starter/        # Evaluation starter
│   ├── figma-design/        # Figma design template
│   ├── figma-figjam/        # FigJam template
│   └── make/                # Make template
├── packages/                # Shared packages
│   └── shared/              # Shared workspace package
├── apps/                    # Prototype applications (created via worktrees)
├── .claude/                 # Claude configuration
└── .github/                 # GitHub workflows
```

## Important Notes

This repository is for **prototyping only**:

- No data persistence (everything resets on refresh)
- Features only need to demonstrate UX, not full functionality
- Mock data is used instead of real backends
- Focus on visual fidelity and user flows
