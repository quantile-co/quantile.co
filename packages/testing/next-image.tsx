import type { ComponentProps } from "react";

// Browser layout tests run in Vite, not Next.js. Keep the fill positioning.
export default function BrowserImage({
  alt,
  fill,
  ...props
}: ComponentProps<"img"> & { fill?: boolean }) {
  return (
    // biome-ignore lint/performance/noImgElement: The browser test runner runs in Vite, not Next.js.
    <img
      alt={alt ?? ""}
      {...props}
      style={
        fill
          ? {
              ...props.style,
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
            }
          : props.style
      }
    />
  );
}
