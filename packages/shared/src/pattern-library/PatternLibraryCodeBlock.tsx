import { useState } from 'react';
import { Button} from '@figma/fpl-components';
import { Icon24Code, Icon24Clipboard, Icon24Check } from '@figma/fpl-icons';
import { Pre } from '../typography/Pre';

interface PatternLibraryCodeBlockProps {
  code: string;
}

export function PatternLibraryCodeBlock({ code }: PatternLibraryCodeBlockProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col border-t border-border">
      <div className="flex items-center p-2 gap-1">
        <Button iconPrefix={<Icon24Code />} variant="ghost" onClick={() => setIsVisible((v) => !v)}>
          {isVisible ? 'Hide code' : 'Show code'}
        </Button>
        {isVisible && (
          <Button variant="ghost" iconPrefix={copied ? <Icon24Check /> : <Icon24Clipboard />} aria-label={copied ? 'Copied' : 'Copy code'} onClick={handleCopy}>
            {copied ? "Copied to clipboard" : "Copy code"}
          </Button>
        )}
      </div>
      {isVisible && (
        <Pre syntax="jsx" lineNumbers className="rounded-t-none border-t-0">
          {code}
        </Pre>
      )}
    </div>
  );
}
