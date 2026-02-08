"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** How many sibling page buttons to show on each side of current page */
  siblingCount?: number;
  className?: string;
}

function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i++) result.push(i);
  return result;
}

function getPaginationRange(
  currentPage: number,
  totalPages: number,
  siblingCount: number
): (number | "dots")[] {
  // Total visible page numbers (siblings on each side + current + first + last + 2 dots max)
  const totalPageNumbers = siblingCount * 2 + 5;

  // If total pages is small enough, show all
  if (totalPages <= totalPageNumbers) {
    return range(1, totalPages);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const showLeftDots = leftSiblingIndex > 2;
  const showRightDots = rightSiblingIndex < totalPages - 1;

  if (!showLeftDots && showRightDots) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = range(1, leftItemCount);
    return [...leftRange, "dots", totalPages];
  }

  if (showLeftDots && !showRightDots) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = range(totalPages - rightItemCount + 1, totalPages);
    return [1, "dots", ...rightRange];
  }

  // Both dots
  const middleRange = range(leftSiblingIndex, rightSiblingIndex);
  return [1, "dots", ...middleRange, "dots", totalPages];
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const paginationRange = getPaginationRange(currentPage, totalPages, siblingCount);

  return (
    <nav
      className={cn("flex items-center justify-center gap-1", className)}
      aria-label="Paginación"
    >
      {/* First page */}
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        aria-label="Primera página"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>

      {/* Previous */}
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Page numbers */}
      {paginationRange.map((page, index) => {
        if (page === "dots") {
          return (
            <span
              key={`dots-${index}`}
              className="px-2 text-muted-foreground select-none"
            >
              …
            </span>
          );
        }

        return (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="icon"
            className="h-9 w-9"
            onClick={() => onPageChange(page)}
            aria-label={`Página ${page}`}
            aria-current={currentPage === page ? "page" : undefined}
          >
            {page}
          </Button>
        );
      })}

      {/* Next */}
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Página siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Last page */}
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        aria-label="Última página"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}

/** Helper to paginate a client-side array */
export function paginateArray<T>(
  items: T[],
  page: number,
  pageSize: number
): { data: T[]; totalPages: number; totalItems: number } {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const data = items.slice(start, start + pageSize);
  return { data, totalPages, totalItems };
}
