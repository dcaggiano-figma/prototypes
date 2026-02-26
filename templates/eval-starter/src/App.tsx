import { useState } from 'react';
import { Input, Label, Button } from '@figma/fpl-components';

function App() {
  console.error('[EVAL] Login form loaded');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);

    // If valid, do nothing (no-op)
    if (Object.keys(newErrors).length === 0) {
      console.log('Form is valid');
    }
  };

  return (
    <div className="bg-bg-secondary min-h-screen flex items-center justify-center">
      <div className="bg-bg p-24px rounded-lg">
        <div className="mb-16px">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(value) => setEmail(value)}
          />
          {errors.email && (
            <div className="text-text-danger text-bodySm mt-4px">
              {errors.email}
            </div>
          )}
        </div>

        <div className="mb-16px">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(value) => setPassword(value)}
          />
          {errors.password && (
            <div className="text-text-danger text-bodySm mt-4px">
              {errors.password}
            </div>
          )}
        </div>

        <div className="mt-24px">
          <Button variant="primary" size="lg" onClick={handleSubmit}>
            Log in
          </Button>
        </div>
      </div>
    </div>
  );
}

export default App;
