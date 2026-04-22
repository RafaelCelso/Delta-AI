"use client";

import React from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationIconProps {
  count: number;
}

/**
 * Bell icon button with an optional badge showing the count of pending
 * notifications. Uses forwardRef so it can be composed as a
 * DropdownMenuTrigger child (via asChild).
 *
 * Requisitos: 4.2, 4.3
 */
const NotificationIcon = React.forwardRef<
  HTMLButtonElement,
  NotificationIconProps
>(({ count, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="sm"
      className="relative h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
      {...props}
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
          {count}
        </span>
      )}
    </Button>
  );
});

NotificationIcon.displayName = "NotificationIcon";

export { NotificationIcon };
export type { NotificationIconProps };
