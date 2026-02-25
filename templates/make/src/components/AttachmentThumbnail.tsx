import { ButtonPrimitive, LoadingSpinner } from '@figma/fpl-components';
import { Icon16Close } from '@figma/fpl-icons';
import type { Attachment } from '../types';

interface AttachmentThumbnailProps {
  attachment: Attachment;
  onRemove?: () => void;
}

export function AttachmentThumbnail({ attachment, onRemove }: AttachmentThumbnailProps) {
  return (
    <div
      className="relative group flex w-[48px] h-[48px] border border-border rounded-md items-center justify-center bg-bg-secondary bg-cover bg-center"
      // eslint-disable-next-line react/forbid-dom-props
      style={!attachment.loading ? { backgroundImage: `url(${attachment.url})` } : undefined}
    >
      {attachment.loading && <LoadingSpinner size="sm" />}
      {onRemove && (
        <div className="invisible group-hover:visible flex absolute top-0 right-0 translate-x-2 -translate-y-2">
          <ButtonPrimitive
            aria-label="Remove attachment"
            className="bg-bg-inverse rounded-full"
            onClick={onRemove}
          >
            <Icon16Close className="fill-icon-oninverse" />
          </ButtonPrimitive>
        </div>
      )}
    </div>
  );
}
