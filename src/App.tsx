import { useState, useEffect } from "react";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { ArtistSelection } from "./components/ArtistSelection";
import { SelectionSummary } from "./components/SelectionSummary";
import { Discoveries } from "./components/Discoveries";
import { createFixtureService } from "./services/fixture-service";
import type { ArtistRef, ArtistTriple, PersonProfile, FeedbackValue, PersonId, Revision } from "./types";
import { bothNamesComplete } from "./lib/names";

type Step = "welcome" | "nicknames" | "select-a" | "select-b" | "summary" | "discoveries" | "revision";

type FeedbackMap = Record<string, FeedbackValue>;
type AllFeedback = Record<PersonId, FeedbackMap>;

const fixtureService = createFixtureService();

const unique = (values: readonly string[]): string[] => [...new Set(values)];

export function App() {
  const [step, setStep] = useState<Step>("welcome");
  const [names, setNames] = useState<[string, string]>(["", ""]);
  const [selections, setSelections] = useState<[readonly ArtistRef[], readonly ArtistRef[]]>([[], []]);
  const [feedback, setFeedback] = useState<AllFeedback>({ a: {}, b: {} });
  const [revision, setRevision] = useState<Revision | null>(null);
  const [revisionSubmitted, setRevisionSubmitted] = useState(false);
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const displayNames: [string, string] = [names[0].trim(), names[1].trim()];

  // A new selection set starts with no feedback and no revision.
  useEffect(() => {
    setFeedback({ a: {}, b: {} });
    setRevision(null);
    setRevisionSubmitted(false);
    setRevisionError(null);
  }, [selections]);

  const profileA: PersonProfile = {
    id: "a",
    nickname: displayNames[0] || undefined,
    artists: selections[0].length === 3 ? selections[0] as ArtistTriple : ([] as unknown as ArtistTriple),
  };
  const profileB: PersonProfile = {
    id: "b",
    nickname: displayNames[1] || undefined,
    artists: selections[1].length === 3 ? selections[1] as ArtistTriple : ([] as unknown as ArtistTriple),
  };

  const setPersonFeedback = (personId: PersonId, entityId: string, value: FeedbackValue | null) => {
    setFeedback(previous => ({
      ...previous,
      [personId]: {
        ...previous[personId],
        ...(value ? { [entityId]: value } : Object.fromEntries(
          Object.entries(previous[personId]).filter(([k]) => k !== entityId)
        )),
      },
    }));
    setRevisionError(null);
  };

  const getPersonFeedback = (personId: PersonId, entityId: string): FeedbackValue | undefined => {
    return feedback[personId][entityId];
  };

  const handleRevise = async () => {
    if (revisionSubmitted || revision) return;
    setRevisionSubmitted(true);
    setRevisionError(null);

    const familiarOrRejectedIds = [...Object.entries(feedback.a), ...Object.entries(feedback.b)]
      .filter(([, value]) => value !== "interested")
      .map(([entityId]) => entityId);
    const excludedEntityIds = unique([
      ...profileA.artists.map(artist => artist.entityId),
      ...profileB.artists.map(artist => artist.entityId),
      ...familiarOrRejectedIds,
    ]);

    try {
      const result = await fixtureService.getRevision({
        profiles: [profileA, profileB],
        feedback: [
          { personId: "a", ratings: feedback.a, submitted: true },
          { personId: "b", ratings: feedback.b, submitted: true },
        ],
        previouslyShownEntityIds: excludedEntityIds,
      });

      if (result.kind === "ok") {
        setRevision(result.data);
        setStep("revision");
        return;
      }

      setRevisionSubmitted(false);
      setRevisionError(result.message);
    } catch {
      setRevisionSubmitted(false);
      setRevisionError("The revision could not be completed. Try again.");
    }
  };

  const canRevise = Object.keys(feedback.a).length > 0 && Object.keys(feedback.b).length > 0;

  if (step === "welcome" || step === "nicknames") {
    return <WelcomeScreen step={step} names={names}
      onNameChange={(index, value) => setNames(previous => index === 0 ? [value, previous[1]] : [previous[0], value])}
      onStart={() => setStep("nicknames")} onBack={() => setStep("welcome")}
      onContinue={() => { if (bothNamesComplete(names)) setStep("select-a"); }}
      canContinue={bothNamesComplete(names)} />;
  }

  const person = step === "select-a" ? 0 : 1;
  return <main className="page">
    <header className="masthead"><span className="wordmark">Borrowed Eyes</span><span className="demo-label">Demo — live recommendations not connected.</span></header>
    {step === "summary" ? <SelectionSummary names={displayNames} selections={selections} onBack={() => setStep("select-b")} onContinue={() => setStep("discoveries")} /> :
      step === "discoveries" ? <Discoveries
        profileA={profileA}
        profileB={profileB}
        feedback={feedback}
        onFeedbackChange={setPersonFeedback}
        getFeedback={getPersonFeedback}
        onBack={() => setStep("summary")}
        onRevise={handleRevise}
        canRevise={canRevise}
        revisionSubmitted={revisionSubmitted}
        revisionComplete={revision !== null}
        revisionError={revisionError}
      /> :
      step === "revision" ? <Discoveries
        profileA={profileA}
        profileB={profileB}
        feedback={feedback}
        onFeedbackChange={setPersonFeedback}
        getFeedback={getPersonFeedback}
        onBack={() => setStep("discoveries")}
        revision={revision}
      /> :
        <ArtistSelection key={person} personId={person === 0 ? "a" : "b"} name={displayNames[person]}
          selected={selections[person]}
          onChange={artists => setSelections(previous => person === 0 ? [artists, previous[1]] : [previous[0], artists])}
          onBack={() => setStep(person === 0 ? "nicknames" : "select-a")}
          onContinue={() => {
            if (selections[person].length !== 3) return;
            if (person === 0) setStep("select-b");
            else if (selections[0].length === 3) setStep("summary");
          }} />}
    <footer>Music is personal. Discovery is an invitation, not a compatibility test.</footer>
  </main>;
}
