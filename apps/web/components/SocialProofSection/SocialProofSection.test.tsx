import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SocialProofSection } from "./SocialProofSection";

describe("social proof", () => {
  it("keeps the full section's client logos without social links", () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <SocialProofSection />
      </MantineProvider>,
    );

    expect(html.match(/<article/g)).toHaveLength(3);
    expect(html).not.toContain("Portrait of AJ Welch");
    expect(html).not.toContain("data-profile");
    expect(html).toContain("Palo Alto");
    expect(html).toContain("Duolingo");
    expect(html.match(/>Clients:<\/span>/g)).toHaveLength(3);
    expect(html).not.toContain("| Clients:");
    expect(html).not.toContain("<a ");
  });
});
