"use client";

import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";

export function LoadingButton({
  loading,
  children,
  ...props
}: ButtonProps & { loading?: boolean }) {
  return (
    <Button disabled={props.disabled || loading} {...props}>
      {loading ? (
        <>
          <Loader2 className="animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

