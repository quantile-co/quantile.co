import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CompactSocialProof,
  FounderProfile,
  SocialProofSection,
} from "./SocialProofSection";

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

  it("keeps the FAQ strip to five labeled squares without client details", () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <CompactSocialProof />
      </MantineProvider>,
    );

    expect(html.match(/data-compact="true"/g)).toHaveLength(4);
    expect(html).toContain('alt="Portrait of AJ Welch"');
    expect(html).toContain("aj-welch.webp");
    for (const company of ["Google", "CompilerWorks", "Chartio"]) {
      expect(html).toContain(`aria-label="${company}"`);
      expect(html).toContain(`>${company}</span>`);
    }
    expect(html).toMatch(
      /<strong>15\+<\/strong><span>years of<br\/>experience<\/span>/,
    );
    expect(html).not.toContain("Staff Data Engineer");
    expect(html).not.toContain("Acquired by");
    expect(html).not.toContain("Clients:");
    expect(html).not.toContain("Palo Alto");
    expect(html).not.toContain('aria-label="AJ Welch on LinkedIn"');
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
