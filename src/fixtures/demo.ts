import type {
  ArtistRef,
  Candidate,
  CombinedProvenance,
  InitialResults,
  IntroductionProvenance,
  PersonFeedback,
  PersonId,
  PersonProfile,
  ResultSection,
  Revision,
  RevisionProvenance,
  ServiceResult,
} from "../types";

const adaVelvet: ArtistRef = { entityId: "fx-a-fav-1", name: "Velvet Orchard" };
const adaMira: ArtistRef = { entityId: "fx-a-fav-2", name: "Mira Solace" };
const adaNorthbound: ArtistRef = { entityId: "fx-a-fav-3", name: "Northbound Atlas" };

const personAGlass: ArtistRef = { entityId: "fx-b-fav-1", name: "Glass Meridian" };
const personBCobalt: ArtistRef = { entityId: "fx-b-fav-2", name: "Cobalt Sparrow" };
const personBIvy: ArtistRef = { entityId: "fx-b-fav-3", name: "Ivy & the Static" };

const personA: PersonProfile = {
  id: "a",
  nickname: "Ada",
  artists: [adaVelvet, adaMira, adaNorthbound],
};

const personB: PersonProfile = {
  id: "b",
  artists: [personAGlass, personBCobalt, personBIvy],
};

const allFavouriteIds = [
  ...personA.artists.map((artist) => artist.entityId),
  ...personB.artists.map((artist) => artist.entityId),
];

const introductionProvenance = (
  personId: PersonId,
  anchors: readonly ArtistRef[],
): IntroductionProvenance => ({ kind: "introduction", personId, anchors });

const combinedProvenance: CombinedProvenance = {
  kind: "combined",
  signalEntityIds: allFavouriteIds,
};

const a1: Candidate = {
  entityId: "fx-cand-a1",
  name: "Aretha Franklin",
  descriptionPresent: true,
  provenance: introductionProvenance("a", [adaVelvet]),
};

const a2: Candidate = {
  entityId: "fx-cand-a2",
  name: "Bill Withers",
  descriptionPresent: false,
  provenance: introductionProvenance("a", [adaMira, adaVelvet]),
};

const a3: Candidate = {
  entityId: "fx-cand-a3",
  name: "Fela Kuti",
  descriptionPresent: true,
  provenance: introductionProvenance("a", [adaNorthbound]),
};

const a4: Candidate = {
  entityId: "fx-cand-a4",
  name: "Sade",
  descriptionPresent: false,
  provenance: introductionProvenance("a", [adaMira]),
};

const b1: Candidate = {
  entityId: "fx-cand-b1",
  name: "Beyoncé",
  descriptionPresent: true,
  provenance: introductionProvenance("b", [personAGlass]),
};

const b2: Candidate = {
  entityId: "fx-cand-b2",
  name: "Nina Simone",
  descriptionPresent: false,
  provenance: introductionProvenance("b", [personBCobalt]),
};

const b3: Candidate = {
  entityId: "fx-cand-b3",
  name: "Kendrick Lamar",
  descriptionPresent: true,
  provenance: introductionProvenance("b", [personBIvy, personBCobalt]),
};

const b4: Candidate = {
  entityId: "fx-cand-b4",
  name: "Adele",
  descriptionPresent: false,
  provenance: introductionProvenance("b", [personAGlass, personBIvy]),
};

const c1: Candidate = {
  entityId: "fx-cand-c1",
  name: "Burna Boy",
  descriptionPresent: true,
  provenance: combinedProvenance,
};

const c2: Candidate = {
  entityId: "fx-cand-c2",
  name: "Stevie Wonder",
  descriptionPresent: false,
  provenance: combinedProvenance,
};

const c3: Candidate = {
  entityId: "fx-cand-c3",
  name: "Wizkid",
  descriptionPresent: true,
  provenance: combinedProvenance,
};

const c4: Candidate = {
  entityId: "fx-cand-c4",
  name: "Tems",
  descriptionPresent: false,
  provenance: combinedProvenance,
};

const c5: Candidate = {
  entityId: "fx-cand-c5",
  name: "Rema",
  descriptionPresent: true,
  provenance: combinedProvenance,
};

const c6: Candidate = {
  entityId: "fx-cand-c6",
  name: "Marvin Gaye",
  descriptionPresent: false,
  provenance: combinedProvenance,
};

const introductionA: ResultSection = {
  id: "introduction_a",
  heading: "Ada's introduction",
  candidates: [a1, a2, a3, a4],
  status: "complete",
};

const introductionB: ResultSection = {
  id: "introduction_b",
  heading: "Person B's introduction",
  candidates: [b1, b2, b3, b4],
  status: "complete",
};

const combinedSection: ResultSection = {
  id: "combined",
  heading: "Combined discovery",
  candidates: [c1, c2, c3, c4, c5, c6],
  status: "complete",
};

const initialResults: InitialResults = {
  sections: [introductionA, introductionB, combinedSection],
  status: "complete",
  warnings: [],
  globalNote:
    "Qloo returns affinity-based suggestions, not predictions that either person will enjoy an artist. The method for combining multiple artist signals is not documented, so combined results do not prove mutual taste, equal influence, or a match.",
};

const shownEntityIds = [...introductionA.candidates, ...introductionB.candidates, ...combinedSection.candidates].map(
  (candidate) => candidate.entityId,
);

const feedbackA: PersonFeedback = {
  personId: "a",
  submitted: true,
  ratings: {
    [a1.entityId]: "known",
    [a2.entityId]: "known",
    [a3.entityId]: "known",
    [a4.entityId]: "not_for_me",
    [b1.entityId]: "interested",
    [b2.entityId]: "known",
    [b3.entityId]: "known",
    [b4.entityId]: "not_for_me",
    [c1.entityId]: "known",
    [c2.entityId]: "known",
    [c3.entityId]: "known",
    [c4.entityId]: "not_for_me",
    [c5.entityId]: "known",
    [c6.entityId]: "known",
  },
};

const feedbackB: PersonFeedback = {
  personId: "b",
  submitted: true,
  ratings: {
    [a1.entityId]: "interested",
    [a2.entityId]: "known",
    [a3.entityId]: "known",
    [a4.entityId]: "not_for_me",
    [b1.entityId]: "known",
    [b2.entityId]: "known",
    [b3.entityId]: "known",
    [b4.entityId]: "known",
    [c1.entityId]: "known",
    [c2.entityId]: "known",
    [c3.entityId]: "known",
    [c4.entityId]: "not_for_me",
    [c5.entityId]: "known",
    [c6.entityId]: "known",
  },
};

const revisionProvenance: RevisionProvenance = {
  kind: "revision",
  signalEntityIds: [...allFavouriteIds, b1.entityId, a1.entityId],
  excludedEntityIds: shownEntityIds,
  addedInterestedEntityIds: [b1.entityId, a1.entityId],
};

const r1: Candidate = {
  entityId: "fx-rev-1",
  name: "Daft Punk",
  descriptionPresent: true,
  provenance: revisionProvenance,
};

const r2: Candidate = {
  entityId: "fx-rev-2",
  name: "Radiohead",
  descriptionPresent: false,
  provenance: revisionProvenance,
};

const r3: Candidate = {
  entityId: "fx-rev-3",
  name: "Aretha Franklin",
  descriptionPresent: true,
  provenance: revisionProvenance,
};

const r4: Candidate = {
  entityId: "fx-rev-4",
  name: "Bill Withers",
  descriptionPresent: false,
  provenance: revisionProvenance,
};

const r5: Candidate = {
  entityId: "fx-rev-5",
  name: "Beyoncé",
  descriptionPresent: true,
  provenance: revisionProvenance,
};

const r6: Candidate = {
  entityId: "fx-rev-6",
  name: "Nina Simone",
  descriptionPresent: false,
  provenance: revisionProvenance,
};

const revision: Revision = {
  candidates: [r1, r2, r3, r4, r5, r6],
  status: "complete",
  summary:
    "Ada's Interested pick Beyoncé and Person B's Interested pick Aretha Franklin were added as signals. Artists marked Not for me were excluded, familiar picks were not repeated, and all 14 earlier artists were excluded from this list.",
  provenanceNote:
    "Returned after excluding previously shown artists; one Interested pick per person was added as a signal.",
};

const searchCatalog: readonly ArtistRef[] = [
  adaVelvet,
  adaMira,
  adaNorthbound,
  personAGlass,
  personBCobalt,
  personBIvy,
  { entityId: "fx-cat-7", name: "Lumen Field" },
  { entityId: "fx-cat-8", name: "Paper Antler" },
  { entityId: "fx-cat-9", name: "Rook Harbor" },
  { entityId: "fx-cat-10", name: "Sadie Quill" },
  { entityId: "fx-cat-11", name: "Juniper Vox" },
  { entityId: "fx-cat-12", name: "Low Tide Cinema" },
  { entityId: "fx-cat-13", name: "Aster Vale" },
  { entityId: "fx-cat-14", name: "Hollow Coast" },
  { entityId: "fx-cat-15", name: "Neon Pilgrim" },
  { entityId: "fx-cat-16", name: "Ferry Lights" },
  { entityId: "fx-cat-17", name: "Quiet Arcade" },
  { entityId: "fx-cat-18", name: "Sable Kite" },
];

export interface SyntheticFixture {
  readonly fixture: true;
  readonly label: string;
  readonly requestPlan: {
    readonly introductionCalls: 6;
    readonly combinedCalls: 1;
    readonly revisionCalls: 1;
    readonly threeIdProfileRequest: "untested";
    readonly introductionMerge: string;
  };
  readonly explanationFallback: {
    readonly mode: "deterministic-template";
    readonly scope: "copy-only";
  };
  readonly profiles: readonly [PersonProfile, PersonProfile];
  readonly searchCatalog: readonly ArtistRef[];
  readonly results: InitialResults;
  readonly feedback: readonly [PersonFeedback, PersonFeedback];
  readonly revision: Revision;
  readonly states: {
    readonly empty: ServiceResult<never>;
    readonly error: ServiceResult<never>;
    readonly quota: ServiceResult<never>;
  };
}

export const demoFixture: SyntheticFixture = {
  fixture: true,
  label: "Demo data - synthetic fixture",
  requestPlan: {
    introductionCalls: 6,
    combinedCalls: 1,
    revisionCalls: 1,
    threeIdProfileRequest: "untested",
    introductionMerge:
      "Round-robin merge of three single-artist requests per person, in confirmed favourite order; every card records its anchors.",
  },
  explanationFallback: {
    mode: "deterministic-template",
    scope: "copy-only",
  },
  profiles: [personA, personB],
  searchCatalog,
  results: initialResults,
  feedback: [feedbackA, feedbackB],
  revision,
  states: {
    empty: {
      kind: "empty",
      fixture: true,
      message: "No suggestions returned for these artists.",
    },
    error: {
      kind: "error",
      fixture: true,
      message: "Something went wrong while fetching suggestions.",
      requestId: "fixture-request-001",
      retryable: true,
    },
    quota: {
      kind: "quota",
      fixture: true,
      message: "Demo limit reached; try again later.",
      retryAfterSeconds: 3600,
    },
  },
};
