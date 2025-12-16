"use client";

import { X } from "lucide-react";
import * as React from "react";

import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ResponsiveFormDrawer({
  title,
  description,
  trigger,
  children,
  contentClassName,
}: {
  title: string;
  description?: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <Drawer direction={isDesktop ? "right" : "bottom"}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent
        className={cn(
          isDesktop
            ? "inset-y-0 right-0 h-full w-full max-w-md border-l shadow-lg"
            : "inset-x-0 bottom-0 mt-24 max-h-[85svh] rounded-t-lg border shadow-lg",
          "flex flex-col",
          contentClassName,
        )}
      >
        {!isDesktop ? (
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted" />
        ) : null}
        <DrawerHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="grid gap-1">
              <DrawerTitle>{title}</DrawerTitle>
              {description ? <DrawerDescription>{description}</DrawerDescription> : null}
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}

