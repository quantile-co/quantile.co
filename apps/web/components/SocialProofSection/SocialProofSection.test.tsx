import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FounderProfile, SocialProofSection } from "./SocialProofSection";

describe("social proof", () => {
  it("reuses AJ’s profile and bio without social links as a standalone card", () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <FounderProfile />
      </MantineProvider>,
    );
    expect(html.match(/data-profile="true"/g)).toHaveLength(1);
    expect(html).toContain('alt="Portrait of AJ Welch"');
    expect(html).toContain("Staff Data Engineer");
    expect(html).toContain("15+ years experience at");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain('data-company="Google"');
    expect(html).not.toContain("Clients:");
  });

  it("keeps the full section's client logos without social links", () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <SocialProofSection />
      </MantineProvider>,
    );

    expect(html).toContain("Palo Alto");
    expect(html).toContain("Duolingo");
    expect(html.match(/>Clients:<\/span>/g)).toHaveLength(3);
    expect(html).not.toContain("| Clients:");
    expect(html).not.toContain("<a ");
  });
});
