import * as React from 'react'
import { Modal } from '@mantine/core'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Context so DialogContent can call onClose without prop-drilling
const DialogCloseCtx = React.createContext<() => void>(() => {})

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}) {
  const onClose = React.useCallback(() => onOpenChange?.(false), [onOpenChange])
  return (
    <DialogCloseCtx.Provider value={onClose}>
      <Modal
        opened={open ?? false}
        onClose={onClose}
        centered
        withCloseButton={false}
        padding={0}
        radius="lg"
        overlayProps={{ backgroundOpacity: 0.5 }}
        transitionProps={{ transition: 'fade', duration: 150 }}
        classNames={{ content: 'overflow-visible' }}
      >
        {children}
      </Modal>
    </DialogCloseCtx.Provider>
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
}: {
  className?: string
  children?: React.ReactNode
  showCloseButton?: boolean
}) {
  const onClose = React.useContext(DialogCloseCtx)
  return (
    <div
      className={cn(
        'relative grid w-full gap-4 rounded-lg p-4 shadow-lg sm:p-6',
        className,
      )}
    >
      {children}
      {showCloseButton && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
        >
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </button>
      )}
    </div>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & { showCloseButton?: boolean }) {
  const onClose = React.useContext(DialogCloseCtx)
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <button
          onClick={onClose}
          className="hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors"
        >
          Close
        </button>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p className={cn('text-muted-foreground text-sm', className)} {...props} />
  )
}

function DialogClose({ children, ...props }: React.ComponentProps<'button'>) {
  const onClose = React.useContext(DialogCloseCtx)
  return (
    <button onClick={onClose} {...props}>
      {children}
    </button>
  )
}

// Stubs for Radix-pattern components no longer needed but kept for API compat
function DialogTrigger({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}
function DialogPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}
function DialogOverlay() {
  return null
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
