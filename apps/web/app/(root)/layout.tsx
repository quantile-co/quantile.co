import type { ReactNode } from "react";
import { Header } from "@/components/Header/Header";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
