'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetPortal = DialogPrimitive.Portal;
const SheetClose = DialogPrimitive.Close;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 dark:bg-black/70',
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = 'SheetOverlay';

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: 'right' | 'left' | 'bottom';
  }
>(({ className, children, side = 'right', ...props }, ref) => {
  const sideClasses =
    side === 'right'
      ? 'inset-y-0 right-0 h-full w-[min(440px,100vw)] border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right'
      : side === 'left'
        ? 'inset-y-0 left-0 h-full w-[min(440px,100vw)] border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left'
        : 'inset-x-0 bottom-0 max-h-[88vh] w-full rounded-t-3xl border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom';
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden border-ink-200 bg-white shadow-pop outline-none transition data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300 dark:border-ink-800 dark:bg-ink-900',
          sideClasses,
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = 'SheetContent';

const SheetHeader = ({
  title,
  onClose,
  right,
}: {
  title: React.ReactNode;
  onClose?: () => void;
  right?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4 dark:border-ink-800">
    <DialogPrimitive.Title className="text-[17px] font-bold tracking-tight">
      {title}
    </DialogPrimitive.Title>
    <div className="flex items-center gap-1">
      {right}
      <DialogPrimitive.Close
        onClick={onClose}
        aria-label="Close"
        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800"
      >
        <X className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </DialogPrimitive.Close>
    </div>
  </div>
);

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('px-5 text-sm text-ink-500 dark:text-ink-400', className)}
    {...props}
  />
));
SheetDescription.displayName = 'SheetDescription';

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetDescription,
};
