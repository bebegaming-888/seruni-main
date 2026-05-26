import * as React from "react";

import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the card is an interactive element (clickable/pressable). Enables keyboard
   *  activation via Enter/Space and adds visual focus ring. */
  interactive?: boolean;
  /** Tab index passed when interactive=true; defaults to 0. Use -1 to exclude from tab order. */
  interactiveTabIndex?: React.HTMLAttributes<HTMLDivElement>["tabIndex"];
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, interactiveTabIndex = 0, onKeyDown, ...props }, ref) => {
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (interactive && (e.key === "Enter" || e.key === " ")) {
          // Trigger click when card is focused and user presses Enter or Space
          // Programmatically invoke the click handler without scrolling
          (e.currentTarget as HTMLDivElement).click();
        }
        onKeyDown?.(e);
      },
      [interactive, onKeyDown],
    );

    return (
      <div
        ref={ref}
        tabIndex={interactive ? interactiveTabIndex : undefined}
        onKeyDown={interactive ? handleKeyDown : onKeyDown}
        className={cn(
          "rounded-xl border bg-card text-card-foreground shadow-sm",
          "transition-all duration-200 ease-out",
          interactive &&
            "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
          className,
        )}
        {...props}
      />
    );
  },
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("font-semibold leading-snug tracking-normal", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
