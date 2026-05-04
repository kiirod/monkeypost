"use client";

export default function TermsOfService() {
  return (
    <main style={{ minHeight: "100vh", background: "#323437", fontFamily: "var(--font-roboto-mono), monospace", display: "flex", flexDirection: "column" }}>
      <div style={{ width: "100%", padding: "16px 32px", borderBottom: "1px solid #3a3d42", display: "flex", alignItems: "center", position: "sticky", top: 0, background: "#323437", zIndex: 10 }}>
        <a href="/" style={{ fontSize: 22, fontWeight: 700, color: "#e2b714", textDecoration: "none", letterSpacing: "-0.5px" }}>monkeypost</a>
      </div>

      <div style={{ maxWidth: 720, width: "100%", margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ color: "#e2b714", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: "#646669", fontSize: 13, marginBottom: 48 }}>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        <Section title="1. Acceptance of Terms">
          By accessing or using Monkeypost, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the platform. We reserve the right to update these terms at any time, and continued use of the platform constitutes acceptance of any changes.
        </Section>

        <Section title="2. Community Standards">
          Monkeypost is committed to providing a welcoming, harassment-free environment for everyone, regardless of age, body size, disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socioeconomic status, nationality, personal appearance, race, religion, or sexual identity and orientation.
          <br /><br />
          We do not tolerate harassment, hate speech, discrimination, or abusive behaviour of any kind. All members of our community are expected to treat one another with respect and dignity at all times.
        </Section>

        <Section title="3. Prohibited Conduct">
          The following conduct is strictly prohibited on Monkeypost:
          <br /><br />
          — Harassment, intimidation, or threats directed at any individual or group<br />
          — Posting sexually explicit, graphic, or violent content<br />
          — Sharing content that promotes hatred, discrimination, or harm<br />
          — Impersonating another person or entity<br />
          — Posting spam, unsolicited advertisements, or repetitive content<br />
          — Attempting to circumvent platform safety measures or moderation<br />
          — Sharing private information about others without their consent
        </Section>

        <Section title="4. Account Termination & Bans">
          We reserve the right to suspend or permanently ban any account that violates these Terms of Service, at our sole discretion and without prior notice.
          <br /><br />
          <strong style={{ color: "#d1d0c5" }}>If your account has been banned, you may not create a new account to circumvent the ban.</strong> Doing so is a direct violation of these terms and will result in the new account being banned as well. Repeated circumvention may result in further action.
        </Section>

        <Section title="5. Content Ownership">
          You retain ownership of the content you post on Monkeypost. By posting content, you grant Monkeypost a non-exclusive, royalty-free licence to display and distribute your content on the platform. You are solely responsible for the content you post and its compliance with these terms.
        </Section>

        <Section title="6. Privacy">
          We collect minimal data necessary to operate the platform. We do not sell your personal data to third parties. Profile information you provide is publicly visible to other users of the platform.
        </Section>

        <Section title="7. Limitation of Liability">
          Monkeypost is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the platform, including but not limited to loss of data, service interruptions, or content posted by other users.
        </Section>

        <Section title="8. Contact">
          If you have questions about these Terms of Service, or wish to report a violation, please reach out to us via our <a href="/discord" style={{ color: "#e2b714", textDecoration: "none" }}>Discord server</a>.
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #3a3d42", color: "#646669", fontSize: 12 }}>
          © {new Date().getFullYear()} Monkeypost. All rights reserved.
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ color: "#d1d0c5", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{title}</h2>
      <p style={{ color: "#9a9a9a", fontSize: 14, lineHeight: 1.8, margin: 0 }}>{children}</p>
    </div>
  );
}
