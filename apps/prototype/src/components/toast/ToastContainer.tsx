import { useState, useEffect, useCallback, useRef } from 'react';
import { Toast } from '@figma/fpl-components';
import { useToast, dismissToast, type ToastData } from './store';
import styles from './ToastContainer.module.css';

export function ToastContainer() {
  const storeToast = useToast();
  const [rendered, setRendered] = useState<ToastData | null>(null);
  const [exiting, setExiting] = useState(false);
  const renderedRef = useRef<ToastData | null>(null);

  useEffect(() => {
    if (storeToast) {
      // New toast (or replacement) — enter immediately
      setExiting(false);
      setRendered(storeToast);
      renderedRef.current = storeToast;
    } else if (renderedRef.current) {
      // Toast dismissed — start exit animation
      setExiting(true);
    }
  }, [storeToast]);

  const handleAnimationEnd = useCallback(() => {
    if (exiting) {
      setRendered(null);
      renderedRef.current = null;
      setExiting(false);
    }
  }, [exiting]);

  if (!rendered) return null;

  const handleClose = () => {
    dismissToast(rendered.id);
  };

  // Default 5s timeout; pass 0 to disable auto-dismiss
  const timeoutMs = rendered.timeout === 0 ? undefined : (rendered.timeout ?? 5000);

  return (
    // eslint-disable-next-line @repo/no-arbitrary-value -- 16px is a design token
    <div className="absolute bottom-[calc(100%+16px)] left-1/2 -translate-x-1/2 w-max z-visual-bell">
      <div
        key={rendered.id}
        className={exiting ? styles.exit : styles.enter}
        onAnimationEnd={handleAnimationEnd}
        data-preferred-theme={rendered.theme ?? 'dark'}
      >
        <Toast.Root timeout={timeoutMs} onClose={handleClose} variant={rendered.variant}>
          {rendered.icon && <rendered.icon />}
          <Toast.Message>{rendered.message}</Toast.Message>
          {rendered.link && (
            <Toast.Link href={rendered.link.href}>{rendered.link.label}</Toast.Link>
          )}
          {rendered.button && (
            <Toast.ActionButton action={() => { rendered.button!.onClick(); }}>
              {rendered.button.label}
            </Toast.ActionButton>
          )}
          {rendered.dismissable !== false && <Toast.DismissButton />}
        </Toast.Root>
      </div>
    </div>
  );
}
