import type { Candidate, PersonProfile } from "../types";

export function personName(profile: PersonProfile): string {
  const nickname = profile.nickname?.trim();
  if (nickname) return nickname;
  return profile.id === "a" ? "Person A" : "Person B";
}

export function provenanceText(
  candidate: Candidate,
  profiles: readonly [PersonProfile, PersonProfile],
): string {
  const provenance = candidate.provenance;
  if (provenance.kind === "introduction") {
    const person = personName(profiles[provenance.personId === "a" ? 0 : 1]);
    const names = provenance.anchors.map((anchor) => anchor.name);
    if (names.length > 1) {
      return `Returned from ${person}'s ${names.slice(0, 2).join(" and ")} signals.`;
    }
    return `Returned from ${person}'s ${names[0] ?? "favourite"} signal.`;
  }
  if (provenance.kind === "combined") {
    return "Returned when all six favourites were supplied as signals.";
  }
  return "Returned after excluding previously shown artists; up to two Interested picks were added as signals.";
}

export function signalLine(
  sectionId: "introduction_a" | "introduction_b" | "combined",
  profiles: readonly [PersonProfile, PersonProfile],
): string {
  if (sectionId === "combined") {
    return "Six favourites, one combined signal. This is not a compatibility result.";
  }
  const profile = profiles[sectionId === "introduction_a" ? 0 : 1];
  return `All three signals: ${profile.artists.map((artist) => artist.name).join(" · ")}.`;
}
