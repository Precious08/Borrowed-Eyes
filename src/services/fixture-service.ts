import { demoFixture } from "../fixtures/demo";
import type {
  Candidate,
  InitialResults,
  IntroductionProvenance,
  PersonFeedback,
  PersonId,
  PersonProfile,
  RecommendationService,
  ResultSection,
  Revision,
  RevisionProvenance,
  SearchArtistsInput,
  SearchPayload,
  ServiceResult,
} from "../types";

export type FixtureScenario = "happy" | "empty" | "error" | "quota";

const displayName = (profile: PersonProfile): string => {
  const nickname = profile.nickname?.trim();
  if (nickname) return nickname;
  return profile.id === "a" ? "Person A" : "Person B";
};

const originalProfile = (personId: PersonId): PersonProfile =>
  demoFixture.profiles[personId === "a" ? 0 : 1];

const scenarioState = <T,>(scenario: FixtureScenario): ServiceResult<T> | null => {
  if (scenario === "empty") return demoFixture.states.empty;
  if (scenario === "error") return demoFixture.states.error;
  if (scenario === "quota") return demoFixture.states.quota;
  return null;
};

const mapIntroduction = (
  provenance: IntroductionProvenance,
  selected: PersonProfile,
): IntroductionProvenance => {
  const original = originalProfile(provenance.personId);
  const anchors = provenance.anchors.map((anchor) => {
    const index = original.artists.findIndex((artist) => artist.entityId === anchor.entityId);
    return selected.artists[index >= 0 ? index : 0];
  });
  return { ...provenance, anchors };
};

const adaptCandidate = (
  candidate: Candidate,
  profiles: readonly [PersonProfile, PersonProfile],
  combinedIds: readonly string[],
): Candidate => {
  if (candidate.provenance.kind === "introduction") {
    const selected = profiles[candidate.provenance.personId === "a" ? 0 : 1];
    return { ...candidate, provenance: mapIntroduction(candidate.provenance, selected) };
  }
  if (candidate.provenance.kind === "combined") {
    return { ...candidate, provenance: { ...candidate.provenance, signalEntityIds: combinedIds } };
  }
  return candidate;
};

const adaptSection = (
  section: ResultSection,
  profiles: readonly [PersonProfile, PersonProfile],
  combinedIds: readonly string[],
): ResultSection => {
  const heading =
    section.id === "introduction_a"
      ? `${displayName(profiles[0])}'s introduction`
      : section.id === "introduction_b"
        ? `${displayName(profiles[1])}'s introduction`
        : "Combined discovery";
  return {
    ...section,
    heading,
    candidates: section.candidates.map((candidate) =>
      adaptCandidate(candidate, profiles, combinedIds),
    ),
  };
};

const firstInterested = (feedback: PersonFeedback): string | null => {
  const interested = Object.keys(feedback.ratings)
    .filter((entityId) => feedback.ratings[entityId] === "interested")
    .sort();
  return interested[0] ?? null;
};

const nameFor = (entityId: string): string => {
  const all = demoFixture.results.sections.flatMap((section) => section.candidates);
  return all.find((candidate) => candidate.entityId === entityId)?.name ?? "an Interested pick";
};

export function createFixtureService(scenario: FixtureScenario = "happy"): RecommendationService {
  return {
    mode: "fixture",

    async searchArtists(input: SearchArtistsInput): Promise<ServiceResult<SearchPayload>> {
      const query = input.query.trim().toLowerCase();
      const artists = query.length < 2
        ? []
        : demoFixture.searchCatalog
            .filter((artist) => artist.name.toLowerCase().includes(query))
            .slice(0, 8);
      return {
        kind: "ok",
        fixture: true,
        data: { artists },
        warnings: [],
      };
    },

    async getInitialResults(input): Promise<ServiceResult<InitialResults>> {
      const state = scenarioState<InitialResults>(scenario);
      if (state) return state;
      const profiles = input.profiles;
      const combinedIds = [...profiles[0].artists, ...profiles[1].artists].map(
        (artist) => artist.entityId,
      );
      const sections: [ResultSection, ResultSection, ResultSection] = [
        adaptSection(demoFixture.results.sections[0], profiles, combinedIds),
        adaptSection(demoFixture.results.sections[1], profiles, combinedIds),
        adaptSection(demoFixture.results.sections[2], profiles, combinedIds),
      ];
      return {
        kind: "ok",
        fixture: true,
        data: {
          ...demoFixture.results,
          sections,
          warnings: [],
        },
        warnings: [],
      };
    },

    async getRevision(input): Promise<ServiceResult<Revision>> {
      const state = scenarioState<Revision>(scenario);
      if (state) return state;
      const profiles = input.profiles;
      const feedbackA = input.feedback[0];
      const feedbackB = input.feedback[1];
      const interestedA = firstInterested(feedbackA);
      const interestedB = firstInterested(feedbackB);
      const added = [interestedA, interestedB].filter(
        (entityId): entityId is string => Boolean(entityId),
      );

      const excluded = new Set(input.previouslyShownEntityIds);
      const remaining = demoFixture.revision.candidates.filter(
        (candidate) => !excluded.has(candidate.entityId),
      );

      if (remaining.length === 0) {
        return {
          kind: "empty",
          fixture: true,
          message: "No new shared artists remained after applying both people's feedback.",
        };
      }

      const provenance: RevisionProvenance = {
        kind: "revision",
        signalEntityIds: [
          ...[...profiles[0].artists, ...profiles[1].artists].map((artist) => artist.entityId),
          ...added,
        ],
        excludedEntityIds: input.previouslyShownEntityIds,
        addedInterestedEntityIds: added,
      };

      const addedParts = [
        interestedA ? `${displayName(profiles[0])}'s Interested pick ${nameFor(interestedA)}` : null,
        interestedB ? `${displayName(profiles[1])}'s Interested pick ${nameFor(interestedB)}` : null,
      ].filter((part): part is string => Boolean(part));

      const exclusionNote = `${excluded.size} familiar or rejected ${excluded.size === 1 ? "artist was" : "artists were"} excluded from this list.`;
      const summary = addedParts.length
        ? `${addedParts.join(" and ")} ${addedParts.length === 2 ? "were" : "was"} added as signals. ${exclusionNote}`
        : `No Interested picks were added. ${exclusionNote}`;

      return {
        kind: "ok",
        fixture: true,
        data: {
          ...demoFixture.revision,
          candidates: remaining.map((candidate) => ({
            ...candidate,
            provenance,
          })),
          summary,
          provenanceNote: added.length
            ? "Returned after excluding familiar and rejected artists; one Interested pick per person was added as a signal."
            : "Returned after excluding familiar and rejected artists; no Interested picks were added.",
          status: "complete",
        },
        warnings: [],
      };
    },
  };
}
