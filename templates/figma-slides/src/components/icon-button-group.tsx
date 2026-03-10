import { ButtonPrimitive } from '@figma/fpl-components';

export function IconButtonGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-px">
      {children}
    </div>
  );
}

function Button({
  children,
  ...props
}: {
  children: React.ReactNode
  'aria-label': string
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}) {
  return (
    <ButtonPrimitive
      className="flex flex-1 items-center justify-center h-24px bg-bg-secondary rounded-none first:rounded-l last:rounded-r hover:bg-bg-tertiary"
      {...props}
    >
      {children}
    </ButtonPrimitive>
  );
}

IconButtonGroup.Button = Button;
