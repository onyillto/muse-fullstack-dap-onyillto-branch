import React from "react";

export interface GridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: "sm" | "md" | "lg";
  responsive?: boolean;
  className?: string;
}

export function Grid({
  children,
  columns = 1,
  gap = "md",
  responsive = true,
  className = "",
}: GridProps) {
  const baseClasses = "grid";

  const columnClasses = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };

  const gapClasses = {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  };

  const responsiveClasses = responsive
    ? "xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    : "";

  const classes = [
    baseClasses,
    responsive ? responsiveClasses : columnClasses[columns],
    gapClasses[gap],
    responsive && "px-4",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}

export interface GridItemProps {
  children: React.ReactNode;
  span?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function GridItem({
  children,
  span = 1,
  className = "",
}: GridItemProps) {
  const spanClasses = {
    1: "",
    2: "col-span-2",
    3: "col-span-3",
    4: "col-span-4",
    5: "col-span-5",
    6: "col-span-6",
  };

  const classes = [spanClasses[span], className].filter(Boolean).join(" ");

  return <div className={classes}>{children}</div>;
}
