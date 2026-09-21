import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Bomb Blast Arena",
};

const h2 = "font-display text-ui-yellow text-lg mt-10 mb-3 tracking-wide";
const p = "text-ui-muted leading-relaxed mb-4";

export default function TermsOfService() {
  return (
    <>
      <h1 className="font-display text-3xl text-ui-yellow tracking-wide">
        Terms of Service
      </h1>
      <p className={`${p} mt-2 text-sm`}>Last updated: September 2026</p>

      <h2 className={h2}>1. Acceptance</h2>
      <p className={p}>
        By accessing or playing Bomb Blast Arena (the &ldquo;Game&rdquo;),
        whether in a web
        browser or as a Discord Activity, you agree to these Terms of Service.
        If you do not agree, please do not use the Game.
      </p>

      <h2 className={h2}>2. The Game</h2>
      <p className={p}>
        Bomb Blast Arena is a casual multiplayer bombing game supporting solo
        play against computer opponents and online matches of up to four
        players. The Game is provided free of charge, as-is, and may change or
        be discontinued at any time without notice.
      </p>

      <h2 className={h2}>3. Acceptable use</h2>
      <p className={p}>
        You agree not to use the Game to harass others, to choose nicknames
        that are abusive, impersonating, or unlawful, or to interfere with the
        operation of the Game or its relay servers (for example by exploiting
        bugs, flooding, or attempting unauthorized access). We may block or
        remove access for violations.
      </p>

      <h2 className={h2}>4. Discord integration</h2>
      <p className={p}>
        When launched as a Discord Activity, the Game uses Discord&rsquo;s
        Embedded App SDK to display your game status as Rich Presence and to
        share invite links. Your use of Discord remains governed by
        Discord&rsquo;s own
        Terms of Service and Community Guidelines.
      </p>

      <h2 className={h2}>5. Intellectual property</h2>
      <p className={p}>
        The Game, including its code, artwork, music, and sound effects, is
        owned by its author and protected by applicable laws. You may not copy,
        redistribute, or sell any part of it without permission.
      </p>

      <h2 className={h2}>6. Disclaimer of warranties</h2>
      <p className={p}>
        The Game is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
        without warranties of
        any kind, express or implied. We do not guarantee uninterrupted or
        error-free operation.
      </p>

      <h2 className={h2}>7. Limitation of liability</h2>
      <p className={p}>
        To the maximum extent permitted by law, we are not liable for any
        indirect, incidental, or consequential damages arising from your use
        of the Game, including lost data or lost progress.
      </p>

      <h2 className={h2}>8. Changes</h2>
      <p className={p}>
        We may update these terms from time to time. Continued use of the Game
        after changes take effect constitutes acceptance of the updated terms.
      </p>

      <h2 className={h2}>9. Contact</h2>
      <p className={p}>
        Questions about these terms can be sent to{" "}
        <span className="text-ui-text">[your contact email]</span>.
      </p>
    </>
  );
}
