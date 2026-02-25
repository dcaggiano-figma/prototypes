import { Icon24EmojiLarge, Icon24HomeLarge } from '@figma/fpl-icons';

/* ------------------------------------------------------------------ */
/*  Main-content loading state                                         */
/* ------------------------------------------------------------------ */

export function LoadingView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-16px">
      {/* Dashed placeholder container */}
      <div className="w-[200px] h-[160px] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-12px relative">
        {/* Placeholder illustration icons */}
        <div className="flex items-center gap-24px">
          <span className="text-icon-tertiary">
            <Icon24EmojiLarge />
          </span>
          <span className="text-icon-tertiary">
            <Icon24HomeLarge />
          </span>
        </div>
      </div>
      <span className="text-bodyLg text-text-secondary">Working out the details</span>
    </div>
  );
}
