import { useState } from 'react';
import { ButtonPrimitive, Input, Label, Link } from '@figma/fpl-components';
import { useWorkingState } from '../helpers/workingState';

/* ------------------------------------------------------------------ */
/*  Fallback sign-up form (used in scripted mode or before AI responds) */
/* ------------------------------------------------------------------ */

function FallbackPreview() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex-1 flex items-center justify-center bg-bg-secondary">
      <div className="w-full max-w-[400px] rounded-lg border border-border p-4 bg-bg shadow-200">
        <h1 className="text-xl font-bold text-center mb-6 text-text">
          Create Account
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="flex flex-col gap-4"
        >
          {/* Email */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="preview-email">Email address</Label>
            <Input
              id="preview-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={setEmail}
              className="rounded-md h-5 w-full text-bodyLg py-3 px-2"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="preview-password">Password</Label>
            <div className="flex gap-3 items-center">
              <Input
                id="preview-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={password}
                onChange={setPassword}
                className="rounded-md h-5 w-full text-bodyLg py-3 px-2"
              />
              <ButtonPrimitive
                onClick={() => setShowPassword(!showPassword)}
                className="text-bodyLg text-text-secondary"
              >
                {showPassword ? 'Hide' : 'Show'}
              </ButtonPrimitive>
            </div>
          </div>

          {/* Submit */}
          <ButtonPrimitive className="h-5 text-bodyLg bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover rounded-md py-2 px-4 justify-center" onClick={() => {}}>
            Sign Up
          </ButtonPrimitive>
        </form>

        <p className="text-center text-sm text-text-secondary mt-4">
          Already have an account?{' '}
          <Link href="#">Log in</Link>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PreviewView – renders AI-generated HTML or fallback                 */
/* ------------------------------------------------------------------ */

export function PreviewView() {
  const { previewHtml, chatMode } = useWorkingState();

  if (previewHtml) {
    return (
      <div className="flex-1 flex overflow-hidden bg-bg-secondary">
        <iframe
          title="Preview"
          srcDoc={previewHtml}
          sandbox="allow-scripts"
          className="flex-1 border-none bg-bg"
        />
      </div>
    );
  }

  // Only show the hardcoded fallback in scripted mode
  if (chatMode === 'scripted') {
    return <FallbackPreview />;
  }

  // Live mode with no preview yet — empty state
  return <div className="flex-1 bg-bg-secondary" />;
}
