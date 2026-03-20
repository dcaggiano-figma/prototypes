import { useCallback, useEffect, useRef, useState } from 'react';
import { MenuV2 } from '@figma/fpl-components/beta';

export type MenuType = 'node' | 'canvas';

export function useContextMenu() {
  const [menuType, setMenuType] = useState<MenuType | null>(null);

  // Remember the last menu type so items stay rendered even if FPL fires
  // onOpenChange(false) during hover (focus management with no trigger element).
  const lastMenuTypeRef = useRef<MenuType>('canvas');
  if (menuType) lastMenuTypeRef.current = menuType;

  // Hidden anchor element positioned at right-click coordinates.
  // MenuV2 positions relative to anchorRef, so we move this element to the
  // click location before opening.
  const anchorRef = useRef<HTMLDivElement | null>(null);

  const menuHook = MenuV2.useMenu({
    onOpenChange: (open) => {
      if (!open) setMenuType(null);
    },
  });

  // Point the manager's anchorRef at our hidden anchor div
  useEffect(() => {
    if (anchorRef.current) {
      (menuHook.manager.anchorRef as React.MutableRefObject<HTMLElement>).current = anchorRef.current;
    }
  }, [menuHook.manager.anchorRef]);

  // After items render, open the menu
  useEffect(() => {
    if (menuType) {
      menuHook.manager.setOpen(true);
    }
  }, [menuType, menuHook.manager]);

  const handleOpen = useCallback((type: MenuType, x: number, y: number) => {
    // Position the hidden anchor at the click location
    if (anchorRef.current) {
      anchorRef.current.style.left = `${String(x)}px`;
      anchorRef.current.style.top = `${String(y)}px`;
    }
    setMenuType(type);
  }, []);

  const close = useCallback(() => setMenuType(null), []);

  return {
    handleOpen,
    menuType,
    /** The last non-null menu type — use for rendering items so they persist during FPL transitions */
    lastMenuType: lastMenuTypeRef.current,
    close,
    manager: menuHook.manager,
    /** Ref for a hidden anchor element — mount a zero-size div with this ref */
    anchorRef,
  };
}
