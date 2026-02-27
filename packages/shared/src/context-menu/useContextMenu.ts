import { useCallback, useEffect, useRef, useState } from 'react';
import { Menu } from '@figma/fpl-components';

export type MenuType = 'node' | 'canvas';

export function useContextMenu() {
  const [menuType, setMenuType] = useState<MenuType | null>(null);
  const contextMenuPendingPos = useRef<{ x: number; y: number } | null>(null);

  // Remember the last menu type so items stay rendered even if FPL fires
  // onOpenChange(false) during hover (focus management with no trigger element).
  const lastMenuTypeRef = useRef<MenuType>('canvas');
  if (menuType) lastMenuTypeRef.current = menuType;

  const menuHook = Menu.useMenu({
    onOpenChange: (open) => {
      if (!open) setMenuType(null);
    },
  });

  // Stable ref for openControlledPosition to avoid useEffect dependency churn
  const openControlledPositionRef = useRef(menuHook.openControlledPosition);
  openControlledPositionRef.current = menuHook.openControlledPosition;

  // After items render, open the menu at the pending position
  useEffect(() => {
    if (menuType && contextMenuPendingPos.current) {
      const { x, y } = contextMenuPendingPos.current;
      contextMenuPendingPos.current = null;
      openControlledPositionRef.current(x, y);
    }
  }, [menuType]);

  const handleOpen = useCallback((type: MenuType, x: number, y: number) => {
    contextMenuPendingPos.current = { x, y };
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
  };
}
