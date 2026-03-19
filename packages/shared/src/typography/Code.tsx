import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';

export interface CodeProps extends ComponentPropsWithoutRef<'code'> {}

export const Code = forwardRef<HTMLElement, CodeProps>(function Code(
  { className, ...rest },
  ref,
) {
  return (
    <code
      ref={ref}
      className={clsx('text-codeMd text-text-secondary bg-bg-secondary px-1 rounded-md border border-border', className)}
      {...rest}
    />
  );
});
