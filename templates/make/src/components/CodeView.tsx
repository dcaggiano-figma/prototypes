import React, { useState, useEffect, useMemo, type ComponentType } from 'react';
import clsx from 'clsx';
import { ButtonPrimitive } from '@figma/fpl-components';
import {
  Icon16ChevronRight,
  Icon16ChevronDown,
  Icon16FileFolderClosed,
  Icon16FileFolderOpen,
  Icon16FileTsx,
  Icon16FileCss,
  Icon16FileMd,
  Icon16FileJson,
  Icon24Attention,
  Icon24Warning,
} from '@figma/fpl-icons';
import { useWorkingState } from '../helpers/workingState';
import { buildFileTree } from '../helpers/parseAiResponse';

/* ------------------------------------------------------------------ */
/*  Static file tree data                                               */
/* ------------------------------------------------------------------ */

type FileNode = {
  name: string;
  type: 'file' | 'folder';
  icon?: ComponentType;
  children?: FileNode[];
  content?: string;
};

export const APP_TSX_CONTENT = `// New to code components? View our documentation at:
// https://figma.com/code-components/api

import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Github, Linkedin, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ProjectsPage from './pages/ProjectsPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="fixed top-0 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container flex h-16 items-center">
            <Link to="/" className="mr-4 font-bold text-xl">JD</Link>
            <div className="flex gap-6 ml-6">
              <Link to="/about" className="text-sm hover:text-primary">About</Link>
              <Link to="/projects" className="text-sm hover:text-primary">Projects</Link>
              <a href="#contact" className="text-sm hover:text-primary">Contact</a>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
        </Routes>

        {/* Footer */}
        <footer className="container py-8 border-t">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">© 2025 John Doe. All rights reserved.</p>
            <div className="flex gap-4">
              <Button variant="ghost" size="icon">
                <Github className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Linkedin className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Mail className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;`;

const BUTTON_TSX_CONTENT = `import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        outline: 'border border-input bg-background hover:bg-accent',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };`;

const PROGRESS_BAR_CONTENT = `import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  animated?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  className,
  animated = true,
}: ProgressBarProps) {
  const [width, setWidth] = useState(0);
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setWidth(percentage), 50);
      return () => clearTimeout(timer);
    }
    setWidth(percentage);
    return undefined;
  }, [percentage, animated]);

  return (
    <div className={cn('h-2 w-full rounded-full bg-secondary', className)}>
      <div
        className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
        style={{ width: \`\${width}%\` }}
      />
    </div>
  );
}`;

const LOCAL_STYLES_CONTENT = `.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.hero-section {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 4rem);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}`;

const README_CONTENT = `# Winamp
A nostalgic music player that only plays 90's music
with tons of rattling car bass.

## Getting Started
\`\`\`bash
npm install
npm run dev
\`\`\`

## Features
- Visualizer based on audio stream frequencies
- Toggleable play controls
- Styling influenced by the original theme
- Minimal UI, works out-of-the-box`;

const FILE_TREE: FileNode[] = [
  {
    name: 'App.tsx',
    type: 'file',
    icon: Icon16FileTsx,
    content: APP_TSX_CONTENT,
  },
  {
    name: 'Components',
    type: 'folder',
    children: [
      {
        name: 'Button.tsx',
        type: 'file',
        icon: Icon16FileTsx,
        content: BUTTON_TSX_CONTENT,
      },
      {
        name: 'ProgressBar.tsx',
        type: 'file',
        icon: Icon16FileTsx,
        content: PROGRESS_BAR_CONTENT,
      },
    ],
  },
  {
    name: 'local-styles.css',
    type: 'file',
    icon: Icon16FileCss,
    content: LOCAL_STYLES_CONTENT,
  },
  {
    name: 'Styles',
    type: 'folder',
    children: [],
  },
  {
    name: 'package.json',
    type: 'file',
    icon: Icon16FileJson,
    content: '{\n  "name": "winamp",\n  "version": "0.1.0",\n  "private": true\n}',
  },
  {
    name: 'readme.md',
    type: 'file',
    icon: Icon16FileMd,
    content: README_CONTENT,
  },
];

/* ------------------------------------------------------------------ */
/*  Simple syntax highlighting                                          */
/* ------------------------------------------------------------------ */

const KEYWORD_RE = /\b(import|export|from|const|let|var|function|return|if|else|default|typeof|new|class|extends|interface|type|as)\b/g;
const STRING_RE = /(["'`])(?:(?=(\\?))\2.)*?\1/g;
const COMMENT_RE = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm;
const JSX_TAG_RE = /(<\/?)([\w.]+)/g;
const ATTR_RE = /\b([a-zA-Z-]+)(=)/g;

export function highlightLine(line: string): React.ReactNode[] {
  // Build a list of { start, end, className } ranges
  type Span = { start: number; end: number; cls: string };
  const spans: Span[] = [];

  const collect = (re: RegExp, cls: string, group?: number) => {
    const pattern = new RegExp(re.source, re.flags);
    let m = pattern.exec(line);
    while (m !== null) {
      const idx = group !== undefined ? m.index + (m[0].indexOf(m[group]) - 0) : m.index;
      const text = group !== undefined ? m[group] : m[0];
      spans.push({ start: group !== undefined ? idx : m.index, end: (group !== undefined ? idx : m.index) + text.length, cls });
      m = pattern.exec(line);
    }
  };

  collect(COMMENT_RE, 'text-text-success');
  collect(STRING_RE, 'text-text-warning');
  collect(KEYWORD_RE, 'text-text-brand');
  collect(JSX_TAG_RE, 'text-text-danger', 2);
  collect(ATTR_RE, 'text-text-component', 1);

  // Sort by start position, then remove overlaps (earlier wins)
  spans.sort((a, b) => a.start - b.start);
  const merged: Span[] = [];
  let cursor = 0;
  spans.forEach((s) => {
    if (s.start >= cursor) {
      merged.push(s);
      cursor = s.end;
    }
  });

  // Build react nodes
  const nodes: React.ReactNode[] = [];
  let pos = 0;
  merged.forEach((s) => {
    if (s.start > pos) {
      nodes.push(line.slice(pos, s.start));
    }
    nodes.push(
      <span key={s.start} className={s.cls}>
        {line.slice(s.start, s.end)}
      </span>,
    );
    pos = s.end;
  });
  if (pos < line.length) {
    nodes.push(line.slice(pos));
  }
  return nodes;
}

/* ------------------------------------------------------------------ */
/*  File tree item                                                      */
/* ------------------------------------------------------------------ */

function FileTreeItem({
  node,
  depth,
  selectedFile,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  selectedFile: string;
  onSelect: (fileNode: FileNode) => void;
}) {
  const [expanded, setExpanded] = useState(node.name === 'Components');
  const isFolder = node.type === 'folder';
  const isSelected = !isFolder && selectedFile === node.name;

  const FolderIcon = expanded ? Icon16FileFolderOpen : Icon16FileFolderClosed;
  const ChevronIcon = expanded ? Icon16ChevronDown : Icon16ChevronRight;
  const FileIcon = node.icon || Icon16FileTsx;

  return (
    <>
      <ButtonPrimitive
        onClick={() => {
          if (isFolder) {
            setExpanded(!expanded);
          } else {
            onSelect(node);
          }
        }}
        className={clsx(
          'flex items-center px-1 rounded-md text-bodyMd w-full py-1',
          isSelected ? 'bg-bg-selected text-text' : 'text-text hover:bg-bg-transparent-hover',
        )}
      >
        {depth > 0 && <span className={clsx('shrink-0', depth === 1 ? 'w-16px' : 'w-32px')} aria-hidden />}
        {isFolder ? (
          <>
            <span className="fill-icon-secondary h-16px flex items-center justify-center shrink-0 text-text-secondary">
              <ChevronIcon />
            </span>
            <FolderIcon />
          </>
        ) : (
          <>
            <span className="w-16px h-16px shrink-0" />
            <FileIcon />
          </>
        )}
        <span className="truncate px-2">{node.name}</span>
      </ButtonPrimitive>
      {isFolder && expanded && node.children?.map((child) => (
        <FileTreeItem
          key={child.name}
          node={child}
          depth={depth + 1}
          selectedFile={selectedFile}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Code viewer                                                         */
/* ------------------------------------------------------------------ */

function CodeViewer({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="flex-1 overflow-auto text-bodyMd leading-relaxed py-12px">
      <table className="w-full border-collapse font-mono">
        <tbody>
          {lines.map((line, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={`line-${i}`} className="hover:bg-bg-transparent-hover">
              <td className="select-none text-right pr-16px pl-16px text-text-tertiary w-[1%] whitespace-nowrap align-top">
                {i + 1}
              </td>
              <td className="text-text pr-16px whitespace-pre">
                {highlightLine(line)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CodeView (exported)                                                 */
/* ------------------------------------------------------------------ */

export function CodeView() {
  const { generatedFiles, chatMode } = useWorkingState();

  const activeTree = useMemo(() => {
    if (generatedFiles.length > 0) {
      return buildFileTree(generatedFiles);
    }
    // Only show hardcoded file tree in scripted mode
    if (chatMode === 'scripted') {
      return FILE_TREE;
    }
    return [];
  }, [generatedFiles, chatMode]);

  const [selectedFile, setSelectedFile] = useState<FileNode | null>(activeTree[0] ?? null);

  // Reset selection when tree changes
  useEffect(() => {
    const firstFile = findFirstFile(activeTree);
    setSelectedFile(firstFile);
  }, [activeTree]);

  const handleSelect = (node: FileNode) => {
    setSelectedFile(node);
  };

  // Empty state for live mode before any files are generated
  if (activeTree.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg text-text-tertiary text-bodyMd">
        No files generated yet
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* File tree sidebar */}
      <aside className="w-[200px] shrink-0 border-r border-border bg-bg overflow-y-auto px-8px py-12px flex flex-col gap-4px">
        {activeTree.map((node) => (
          <FileTreeItem
            key={node.name}
            node={node}
            depth={0}
            selectedFile={selectedFile?.name ?? ''}
            onSelect={handleSelect}
          />
        ))}
      </aside>

      {/* Code content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-bg">

        {/* Code */}
        <CodeViewer content={selectedFile?.content ?? ''} />

        {/* File tab bar */}
        <div className="flex items-center border-t border-border px-2 justify-between">
          <div className="icon-secondary flex items-center">
            <Icon24Attention />
            <Icon24Warning />
          </div>
          <div className="flex items-center gap-4px px-8px py-4px text-bodyMd text-text-secondary">
            {selectedFile?.name ?? ''}
          </div>
        </div>
      </div>
    </div>
  );
}

function findFirstFile(nodes: FileNode[]): FileNode | null {
  for (const node of nodes) {
    if (node.type === 'file') return node;
    if (node.children) {
      const found = findFirstFile(node.children);
      if (found) return found;
    }
  }
  return null;
}
