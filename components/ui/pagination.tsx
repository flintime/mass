'use client';

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  className?: string;
  children?: React.ReactNode;
}

export function Pagination({ className, children }: PaginationProps) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
    >
      {children}
    </nav>
  );
}

export function PaginationContent({ className, children }: PaginationProps) {
  return (
    <ul className={cn("flex flex-row items-center gap-1", className)}>
      {children}
    </ul>
  );
}

export function PaginationItem({ className, children }: PaginationProps) {
  return (
    <li className={cn("", className)}>
      {children}
    </li>
  );
}

export function PaginationLink({
  className,
  isActive,
  children,
  ...props
}: {
  className?: string;
  isActive?: boolean;
  children: React.ReactNode;
} & React.ComponentProps<typeof Button>) {
  return (
    <Button
      aria-current={isActive ? "page" : undefined}
      variant={isActive ? "default" : "outline"}
      size="sm"
      className={cn("w-10", className)}
      {...props}
    >
      {children}
    </Button>
  );
}

export function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("w-24 gap-1", className)}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      Previous
    </Button>
  );
}

export function PaginationNext({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("w-24 gap-1", className)}
      {...props}
    >
      Next
      <ChevronRight className="h-4 w-4" />
    </Button>
  );
}
