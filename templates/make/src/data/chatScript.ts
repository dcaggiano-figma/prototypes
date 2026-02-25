import { APP_TSX_CONTENT } from '../components/CodeView';

/* ------------------------------------------------------------------ */
/*  Script step types                                                   */
/* ------------------------------------------------------------------ */

export type ScriptStep =
  /** Show a progress spinner, auto-advance after duration (ms) */
  | { type: 'progress'; label: string; duration: number }
  /** CollapsibleSection that streams content, advances on stream complete */
  | { type: 'reasoning'; content: string }
  /** AI ChatMessage with streaming text, advances on stream complete */
  | { type: 'ai-message'; content: string }
  /** FileCard (viewing), auto-advance after duration (ms) */
  | { type: 'view-file'; fileName: string; duration: number }
  /** Show todo list with "Start tasks" button, advances on button click */
  | { type: 'todo-list'; tasks: string[] }
  /** Mark a task as in_progress, advances immediately */
  | { type: 'start-task'; taskIndex: number }
  /** FileCard (writing) with streaming code, advances on stream complete */
  | { type: 'write-file'; fileName: string; code: string }
  /** Mark task complete, remove FileCard, add work log, advances immediately */
  | { type: 'complete-task'; taskIndex: number; files: string[] }
  /** Show VersionCard, advances immediately */
  | { type: 'version'; label: string }
  /** Show rating buttons, advances immediately */
  | { type: 'rating' }
  /** Set isWorking=false (terminal step) */
  | { type: 'done' };

/* ------------------------------------------------------------------ */
/*  Mock code content for write-file steps                              */
/* ------------------------------------------------------------------ */

const SIGNUP_FORM_CONTENT = `import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function SignUpForm() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Sign up:', formData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 rounded-xl shadow-lg bg-card">
        <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              placeholder="Email address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full pl-10 pr-10 py-2 border rounded-lg"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button type="submit" className="w-full">Sign Up</Button>
        </form>
      </div>
    </div>
  );
}`;

/* ------------------------------------------------------------------ */
/*  Default script – signup form scenario                               */
/* ------------------------------------------------------------------ */

export const DEFAULT_SCRIPT: ScriptStep[] = [
  // 1. Working indicator
  { type: 'progress', label: 'Working...', duration: 5000 },

  // 2. Reasoning streams, then auto-collapses
  {
    type: 'reasoning',
    content:
      "I'll create a professional sign up form with validation and a clean design. Let me start by checking the current project structure and understanding the existing components. I can see the project uses React with TypeScript and Tailwind CSS for styling. The form will need email and password fields with proper validation rules, including minimum length requirements and email format checking. I'll also add a confirm password field and a terms of service checkbox. For the layout I'll use a centered card with subtle shadows and rounded corners to match the existing design system.",
  },

  // 3. AI communicates next steps
  {
    type: 'ai-message',
    content:
      "I'll create a professional sign up form with validation and a clean design. Let me start by checking the current project structure.",
  },

  // 4. Viewing files
  { type: 'view-file', fileName: 'App.tsx', duration: 3000 },

  // 5. Todo list – awaits "Start tasks"
  { type: 'todo-list', tasks: ['Add email field', 'Add password field'] },

  // 6–8. First task
  { type: 'start-task', taskIndex: 0 },
  { type: 'write-file', fileName: 'App.tsx', code: APP_TSX_CONTENT },
  { type: 'complete-task', taskIndex: 0, files: ['App.tsx'] },

  // 9–11. Second task
  { type: 'start-task', taskIndex: 1 },
  { type: 'write-file', fileName: 'SignUpForm.tsx', code: SIGNUP_FORM_CONTENT },
  { type: 'complete-task', taskIndex: 1, files: ['SignUpForm.tsx'] },

  // 12. AI final response
  {
    type: 'ai-message',
    content:
      "I've created a professional sign up form with comprehensive features including form validation, password strength indicator, and visual feedback. The form includes fields for full name, email, password, confirm password, and terms acceptance, with real-time validation using react-hook-form and icons from lucide-react.",
  },

  // 13. Version history
  { type: 'version', label: 'Add email field' },

  // 14. Rating
  { type: 'rating' },

  // 15. Done
  { type: 'done' },
];
