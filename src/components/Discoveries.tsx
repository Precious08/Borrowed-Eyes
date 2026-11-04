import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type {
  FeedbackValue,
  InitialResults,
  PersonProfile,
  PersonId,
  ResultSectionId,
  Revision,
} from "../types";
import { createFixtureService } from "../services/fixture-service";
import { BackButton } from "./BackButton";

interface DiscoveriesProps {
  profileA: PersonProfile;
  profileB: PersonProfile;
  feedback: Record<PersonId, Record<string, FeedbackValue>>;
  onFeedbackChange: (personId: PersonId, entityId: string, value: FeedbackValue | null) => void;
  getFeedback: (personId: PersonId, entityId: string) => FeedbackValue | undefined;
  onBack: () => void;
  onRevise?: () => void;
  canRevise?: boolean;
  revisionSubmitted?: boolean;
  revisionComplete?: boolean;
  revisionError?: string | null;
  revision?: Revision | null;
}

const fixtureService = createFixtureService();

type FeedbackLabel = "Interested" | "Already know" | "Not for me";

const feedbackOptions: readonly [FeedbackValue, FeedbackLabel][] = [
  ["interested", "Interested"],
  ["known", "Already know"],
  ["not_for_me", "Not for me"],
];

type TabId = "combined" | "a" | "b";

const tabOrder: readonly TabId[] = ["combined", "a", "b"];

const tabSectionId: Record<TabId, ResultSectionId> = {
  combined: "combined",
  a: "introduction_a",
  b: "introduction_b",
};

const peopleByTab: Record<TabId, readonly PersonId[]> = {
  combined: ["a", "b"],
  a: ["a"],
  b: ["b"],
};

function baseName(profile: PersonProfile, personId: PersonId): string {
  return profile.nickname?.trim() || (personId === "a" ? "Person A" : "Person B");
}

function personLabels(profileA: PersonProfile, profileB: PersonProfile): Record<PersonId, string> {
  const labelA = baseName(profileA, "a");
  const labelB = baseName(profileB, "b");
  const identical = labelA.toLowerCase() === labelB.toLowerCase();
  return {
    a: identical ? `${labelA} (Side A)` : labelA,
    b: identical ? `${labelB} (Side B)` : labelB,
  };
}

function FeedbackHints() {
  return (
    <div className="visually-hidden">
      <span id="feedback-hint-interested">Interested — you want to explore this artist.</span>
      <span id="feedback-hint-known">Already know — you are familiar with this artist.</span>
      <span id="feedback-hint-not_for_me">Not for me — this artist is not your taste.</span>
    </div>
  );
}

function FeedbackControls({
  personId,
  personLabel,
  entityId,
  candidateName,
  currentValue,
  onChange,
}: {
  personId: PersonId;
  personLabel: string;
  entityId: string;
  candidateName: string;
  currentValue: FeedbackValue | undefined;
  onChange: (value: FeedbackValue | null) => void;
}) {
  return (
    <div className="feedback-row">
      <span className="feedback-person" aria-hidden="true">{personLabel}</span>
      <div className="feedback-options">
        <div
          className="feedback-radio-group"
          role="radiogroup"
          aria-label={`${personLabel}, response to ${candidateName}`}
        >
          {feedbackOptions.map(([value, label]) => {
            const selected = currentValue === value;
            return (
              <label key={value} className={`feedback-option ${selected ? "selected" : ""}`}>
                <input
                  type="radio"
                  name={`feedback-${entityId}-${personId}`}
                  value={value}
                  checked={selected}
                  onChange={() => onChange(value)}
                  aria-describedby={`feedback-hint-${value}`}
                />
                <span className="feedback-option-label">{label}</span>
                {selected && <span className="feedback-check" aria-hidden="true">✓</span>}
              </label>
            );
          })}
        </div>
        {currentValue && (
          <button
            type="button"
            className="feedback-clear"
            onClick={() => onChange(null)}
            aria-label={`Clear ${personLabel}'s response to ${candidateName}`}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function RevisionSummary({ summary }: { summary: string }) {
  return (
    <div className="revision-summary" role="region" aria-labelledby="revision-summary-title">
      <h3 id="revision-summary-title" className="visually-hidden">Revision summary</h3>
      <p>{summary}</p>
      <p className="revision-note">Simulated revision — not a live Qloo result.</p>
    </div>
  );
}

function RevisedDiscoveries({ data }: { data: Revision }) {
  if (data.candidates.length === 0) {
    return (
      <p className="revision-empty">
        No new shared artists remained after applying both people's feedback.
      </p>
    );
  }

  return (
    <div className="revised-discoveries">
      <header className="discovery-header">
        <p className="discovery-type">Revised shared</p>
        <h2>Revised combined discovery</h2>
        <p className="discovery-provenance">
          Based on both people's feedback. Shared artists either person marked Already know or Not for me were excluded,
          and Interested picks were added as signals. This is not a compatibility result.
        </p>
      </header>
      <ol className="discovery-list">
        {data.candidates.map((candidate, index) => (
          <li key={candidate.entityId} className="discovery-item">
            <span className="discovery-index">{index + 1}</span>
            <div className="discovery-content">
              <span className="discovery-name">{candidate.name}</span>
              <p className="discovery-explanation">Included in this simulated revision.</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Discoveries({
  profileA,
  profileB,
  onFeedbackChange,
  getFeedback,
  onBack,
  onRevise,
  canRevise,
  revisionSubmitted,
  revisionComplete,
  revisionError,
  revision,
}: DiscoveriesProps) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ready"; data: InitialResults }
    | { kind: "empty"; message: string }
    | { kind: "error"; message: string; requestId: string; retryable: boolean }
  >({ kind: "loading" });
  const [activeTab, setActiveTab] = useState<TabId>("combined");
  const heading = useRef<HTMLHeadingElement>(null);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    combined: null,
    a: null,
    b: null,
  });
  const [announcement, setAnnouncement] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const isRevisionView = !!revision;

  useEffect(() => {
    if (isRevisionView) {
      heading.current?.focus();
      setAnnouncement("Revised discoveries loaded.");
      return;
    }
    let cancelled = false;
    heading.current?.focus();
    fixtureService.getInitialResults({ profiles: [profileA, profileB] }).then((result) => {
      if (cancelled) return;
      if (result.kind === "ok") {
        setState({ kind: "ready", data: result.data });
        setAnnouncement("Discoveries loaded. Fixed demo artists.");
      } else if (result.kind === "empty") {
        setState({ kind: "empty", message: result.message });
        setAnnouncement("No discoveries found.");
      } else if (result.kind === "error") {
        setState({ kind: "error", message: result.message, requestId: result.requestId, retryable: result.retryable });
        setAnnouncement(`Error: ${result.message}`);
      } else {
        setState({ kind: "error", message: result.message, requestId: "", retryable: false });
        setAnnouncement(`Error: ${result.message}`);
      }
    }).catch(() => {
      if (cancelled) return;
      const message = "Discoveries could not be loaded. Try again.";
      setState({ kind: "error", message, requestId: "", retryable: true });
      setAnnouncement(`Error: ${message}`);
    });
    return () => {
      cancelled = true;
    };
  }, [profileA.artists, profileB.artists, isRevisionView, reloadToken]);

  if (isRevisionView) {
    if (!revision) return null;
    return (
      <section className="discoveries" aria-labelledby="discoveries-title">
        <div className="step-row">
          <BackButton onClick={onBack} />
          <p className="eyebrow">The session / 04</p>
        </div>
        <h1 id="discoveries-title" ref={heading} tabIndex={-1}>Revised discoveries</h1>
        <p className="discoveries-notice">One revised list shaped by both people's feedback.</p>
        <p className="visually-hidden" role="status">{announcement}</p>

        <RevisionSummary summary={revision.summary} />
        <RevisedDiscoveries data={revision} />

        <p className="demo-label discoveries-demo">
          Demo — simulated revision. Not a live Qloo result.
        </p>

        <p className="setup-note">
          One revision per session. Use Back to return to discoveries or change selections.
        </p>
      </section>
    );
  }

  if (state.kind === "loading") {
    return (
      <section className="discoveries" aria-labelledby="discoveries-title">
        <div className="step-row">
          <BackButton onClick={onBack} />
          <p className="eyebrow">The session / 03</p>
        </div>
        <h1 id="discoveries-title" ref={heading} tabIndex={-1}>Discoveries</h1>
        <p className="intro">Loading fixed demo artists.</p>
        <div className="discoveries-loading" aria-live="polite" role="status">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" strokeOpacity="0.8">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
            </path>
          </svg>
          <span>Loading discoveries…</span>
        </div>
      </section>
    );
  }

  if (state.kind === "empty") {
    return (
      <section className="discoveries" aria-labelledby="discoveries-title">
        <div className="step-row">
          <BackButton onClick={onBack} />
          <p className="eyebrow">The session / 03</p>
        </div>
        <h1 id="discoveries-title" ref={heading} tabIndex={-1}>Discoveries</h1>
        <p className="intro" role="status">{state.message}</p>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section className="discoveries" aria-labelledby="discoveries-title">
        <div className="step-row">
          <BackButton onClick={onBack} />
          <p className="eyebrow">The session / 03</p>
        </div>
        <h1 id="discoveries-title" ref={heading} tabIndex={-1}>Discoveries</h1>
        <p className="intro" role="alert" style={{ color: "var(--coral)" }}>{state.message}</p>
        {state.retryable && (
          <button
            className="start-button"
            onClick={() => {
              setState({ kind: "loading" });
              setReloadToken((token) => token + 1);
            }}
          >
            Try again
          </button>
        )}
      </section>
    );
  }

  const sections = state.data.sections;
  const labels = personLabels(profileA, profileB);
  const tabLabels: Record<TabId, string> = {
    combined: "For both",
    a: `For ${labels.a}`,
    b: `For ${labels.b}`,
  };

  const revising = Boolean(revisionSubmitted) && !revisionComplete;
  const reviseDisabled = !canRevise || Boolean(revisionSubmitted) || Boolean(revisionComplete);
  const reviseHint = revisionComplete
    ? "Revision complete for this selection set."
    : revising
      ? "Building the revised list…"
      : canRevise
        ? "Both people have responded. One revision available."
        : "Both people need to respond to at least one artist.";

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = tabOrder.indexOf(activeTab);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabOrder.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabOrder.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = tabOrder[nextIndex];
    setActiveTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  return (
    <section className="discoveries" aria-labelledby="discoveries-title">
      <div className="step-row">
        <BackButton onClick={onBack} />
        <p className="eyebrow">The session / 03</p>
      </div>
      <h1 id="discoveries-title" ref={heading} tabIndex={-1}>Discoveries</h1>
      <p className="discoveries-notice">Fixed demo artists. Your feedback shapes one revised list.</p>
      <p className="visually-hidden" role="status">{announcement}</p>
      <FeedbackHints />

      <div className="discoveries-toolbar">
        <div className="discoveries-tabs" role="tablist" aria-label="Discovery groups">
          {tabOrder.map((tabId) => (
            <button
              key={tabId}
              ref={(node) => { tabRefs.current[tabId] = node; }}
              id={`discoveries-tab-${tabId}`}
              type="button"
              role="tab"
              className="discoveries-tab"
              aria-selected={activeTab === tabId}
              aria-controls={`discoveries-panel-${tabId}`}
              tabIndex={activeTab === tabId ? 0 : -1}
              onClick={() => setActiveTab(tabId)}
              onKeyDown={handleTabKeyDown}
            >
              {tabLabels[tabId]}
            </button>
          ))}
        </div>

        {onRevise && (
          <div className="revise-cluster">
            <button
              type="button"
              className="start-button"
              disabled={reviseDisabled}
              onClick={onRevise}
              aria-disabled={reviseDisabled}
              aria-describedby="revise-hint"
            >
              {revisionComplete ? "Revision complete" : revising ? "Revising…" : "Revise discoveries"}
            </button>
            <p id="revise-hint" className="revise-hint">{reviseHint}</p>
          </div>
        )}
      </div>

      {revisionError && (
        <p className="revision-error" role="alert">{revisionError}</p>
      )}

      {tabOrder.map((tabId) => {
        const section = sections.find((item) => item.id === tabSectionId[tabId]);
        if (!section) return null;
        return (
          <div
            key={tabId}
            id={`discoveries-panel-${tabId}`}
            className="discoveries-panel"
            role="tabpanel"
            aria-labelledby={`discoveries-tab-${tabId}`}
            hidden={activeTab !== tabId}
          >
            <ol className="track-list">
              {section.candidates.map((candidate, index) => (
                <li key={candidate.entityId} className="track-row">
                  <div className="track-main">
                    <span className="track-index" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="track-name">{candidate.name}</span>
                  </div>
                  <div className="track-feedback">
                    {peopleByTab[tabId].map((personId) => (
                      <FeedbackControls
                        key={personId}
                        personId={personId}
                        personLabel={labels[personId]}
                        entityId={candidate.entityId}
                        candidateName={candidate.name}
                        currentValue={getFeedback(personId, candidate.entityId)}
                        onChange={(value) => onFeedbackChange(personId, candidate.entityId, value)}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            {section.warning && <p className="discovery-warning">{section.warning}</p>}
          </div>
        );
      })}
    </section>
  );
}
