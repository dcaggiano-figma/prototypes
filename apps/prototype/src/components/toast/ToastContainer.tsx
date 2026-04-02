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
      setExiting(false);
      setRendered(storeToast);
      renderedRef.current = storeToast;
    } else if (renderedRef.current) {
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

  const timeoutMs = rendered.timeout === 0 ? undefined : (rendered.timeout ?? 5000);
  const IconComponent = rendered.icon;

  return (
    <div className="pointer-events-none fixed bottom-24px left-1/2 z-[220] w-max -translate-x-1/2">
      <div
        key={rendered.id}
        className={`pointer-events-auto ${exiting ? styles.exit : styles.enter}`}
        onAnimationEnd={handleAnimationEnd}
        data-preferred-theme={rendered.theme ?? 'dark'}
      >
        <Toast.Root timeout={timeoutMs} onClose={handleClose} variant={rendered.variant}>
          {IconComponent ? <IconComponent /> : null}
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
