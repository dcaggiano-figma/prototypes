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
  disabled,
  ...props
}: {
  children: React.ReactNode
  disabled?: boolean
  'aria-label': string
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}) {
  return (
    <ButtonPrimitive
      className="flex flex-1 items-center justify-center h-24px bg-bg-secondary rounded-none first:rounded-l last:rounded-r hover:bg-bg-tertiary disabled:opacity-30 disabled:pointer-events-none"
      disabled={disabled}
      {...props}
    >
      {children}
    </ButtonPrimitive>
  );
}

IconButtonGroup.Button = Button;
