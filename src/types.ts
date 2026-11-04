export type PersonId = "a" | "b";

export interface ArtistRef {
  readonly entityId: string;
  readonly name: string;
}

export type ArtistTriple = readonly [ArtistRef, ArtistRef, ArtistRef];

export interface PersonProfile {
  readonly id: PersonId;
  readonly nickname?: string;
  readonly artists: ArtistTriple;
}

export type FeedbackValue = "interested" | "known" | "not_for_me";

export type FeedbackMap = Readonly<Record<string, FeedbackValue>>;

export interface PersonFeedback {
  readonly personId: PersonId;
  readonly ratings: FeedbackMap;
  readonly submitted: boolean;
}

export interface IntroductionProvenance {
  readonly kind: "introduction";
  readonly personId: PersonId;
  readonly anchors: readonly ArtistRef[];
}

export interface CombinedProvenance {
  readonly kind: "combined";
  readonly signalEntityIds: readonly string[];
}

export interface RevisionProvenance {
  readonly kind: "revision";
  readonly signalEntityIds: readonly string[];
  readonly excludedEntityIds: readonly string[];
  readonly addedInterestedEntityIds: readonly string[];
}

export type CandidateProvenance =
  | IntroductionProvenance
  | CombinedProvenance
  | RevisionProvenance;

export interface Candidate {
  readonly entityId: string;
  readonly name: string;
  readonly imageUrl?: string;
  readonly descriptionPresent: boolean;
  readonly provenance: CandidateProvenance;
  readonly alsoAppearedInIntroduction?: boolean;
}

export type ResultSectionId =
  | "introduction_a"
  | "introduction_b"
  | "combined";

export type ResultStatus = "complete" | "partial" | "empty";

export interface ResultSection {
  readonly id: ResultSectionId;
  readonly heading: string;
  readonly candidates: readonly Candidate[];
  readonly status: ResultStatus;
  readonly warning?: string;
}

export interface InitialResults {
  readonly sections: readonly [ResultSection, ResultSection, ResultSection];
  readonly status: ResultStatus;
  readonly warnings: readonly string[];
  readonly globalNote: string;
}

export interface Revision {
  readonly candidates: readonly Candidate[];
  readonly status: ResultStatus;
  readonly summary: string;
  readonly provenanceNote: string;
}

export type OperationState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "ready" }
  | { readonly kind: "empty"; readonly message: string }
  | {
      readonly kind: "error";
      readonly message: string;
      readonly requestId: string;
      readonly retryable: boolean;
    }
  | {
      readonly kind: "quota";
      readonly message: string;
      readonly retryAfterSeconds?: number;
    };

export interface SearchPayload {
  readonly artists: readonly ArtistRef[];
}

export type ServiceResult<T> =
  | {
      readonly kind: "ok";
      readonly fixture: boolean;
      readonly data: T;
      readonly warnings: readonly string[];
    }
  | { readonly kind: "empty"; readonly fixture: boolean; readonly message: string }
  | {
      readonly kind: "error";
      readonly fixture: boolean;
      readonly message: string;
      readonly requestId: string;
      readonly retryable: boolean;
    }
  | {
      readonly kind: "quota";
      readonly fixture: boolean;
      readonly message: string;
      readonly retryAfterSeconds?: number;
    };

export interface SearchArtistsInput {
  readonly query: string;
}

export interface InitialResultsInput {
  readonly profiles: readonly [PersonProfile, PersonProfile];
}

export interface RevisionInput {
  readonly profiles: readonly [PersonProfile, PersonProfile];
  readonly feedback: readonly [PersonFeedback, PersonFeedback];
  readonly previouslyShownEntityIds: readonly string[];
}

export type ServiceMode = "fixture" | "live";

export interface RecommendationService {
  readonly mode: ServiceMode;
  searchArtists(
    input: SearchArtistsInput,
  ): Promise<ServiceResult<SearchPayload>>;
  getInitialResults(
    input: InitialResultsInput,
  ): Promise<ServiceResult<InitialResults>>;
  getRevision(input: RevisionInput): Promise<ServiceResult<Revision>>;
}
