import { useEffect, useRef, useState, type FormEvent } from "react";
import { IllosVectorSearch } from "../illos/vector-search";
import { BackButton } from "./BackButton";
import { isNameComplete } from "../lib/names";

interface WelcomeScreenProps {
  step: "welcome" | "nicknames";
  names: readonly [string, string];
  onNameChange: (index: 0 | 1, value: string) => void;
  onStart: () => void;
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
}

export function WelcomeScreen({
  step,
  names,
  onNameChange,
  onStart,
  onBack,
  onContinue,
  canContinue,
}: WelcomeScreenProps) {
  const [touched, setTouched] = useState<[boolean, boolean]>([false, false]);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (step === "nicknames") firstInputRef.current?.focus();
    else if (navigatedRef.current) startButtonRef.current?.focus();
    navigatedRef.current = true;
  }, [step]);

  function markTouched(index: number) {
    setTouched((previous) => {
      const next: [boolean, boolean] = [previous[0], previous[1]];
      next[index] = true;
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue) {
      setTouched([!isNameComplete(names[0]), !isNameComplete(names[1])] as [boolean, boolean]);
      firstInputRef.current?.focus();
      return;
    }
    onContinue();
  }

  if (step === "nicknames") {
    return (
      <main className="page">
        <header className="masthead">
          <span className="wordmark">Borrowed Eyes<span aria-hidden="true">®</span></span>
          <span className="demo-label">Demo — live recommendations not connected.</span>
        </header>
        <section className="setup" aria-labelledby="setup-title">
          <div className="step-row">
            <BackButton onClick={onBack} />
            <p className="eyebrow">The session / 01</p>
          </div>
          <h1 id="setup-title">Two people.<br /><em>Two perspectives.</em></h1>
          <p className="intro">Enter a name or nickname for each person.</p>
          <form className="setup-form" noValidate onSubmit={handleSubmit}>
            <div className="people">
              {names.map((name, index) => {
                const invalid = touched[index] && !isNameComplete(name);
                const errorId = `nickname-error-${index}`;
                return (
                  <div className="person" key={index}>
                    <div className="person-head">
                      <span className="side">Side {index === 0 ? "A" : "B"}</span>
                      <span className="person-record" aria-hidden="true">
                        <span>{index === 0 ? "A" : "B"}</span>
                      </span>
                    </div>
                    <label htmlFor={`nickname-${index}`}>Person {index === 0 ? "A" : "B"} name or nickname</label>
                    <input
                      ref={index === 0 ? firstInputRef : undefined}
                      id={`nickname-${index}`}
                      value={name}
                      maxLength={24}
                      autoComplete="off"
                      placeholder={index === 0 ? "e.g. Ada" : "e.g. Sam"}
                      aria-invalid={invalid || undefined}
                      aria-describedby={invalid ? errorId : undefined}
                      onBlur={() => markTouched(index)}
                      onChange={(e) => onNameChange(index === 0 ? 0 : 1, e.target.value)}
                    />
                    {invalid && (
                      <p className="field-error" id={errorId} role="alert">
                        Enter a name or nickname for Person {index === 0 ? "A" : "B"}.
                      </p>
                    )}
                    <p>Three favourite artists will go here.</p>
                  </div>
                );
              })}
            </div>
            <div className="setup-actions">
              <button
                type="submit"
                className="start-button"
                disabled={!canContinue}
              >
                Continue → Artist selection
              </button>
            </div>
          </form>
          <p className="demo-label" style={{ marginTop: "24px", textAlign: "center" }}>
            Demo — live recommendations not connected.
          </p>
        </section>
        <footer>Music is personal. Discovery is an invitation, not a compatibility test.</footer>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="masthead">
        <span className="wordmark">Borrowed Eyes<span aria-hidden="true">®</span></span>
        <span className="demo-label">Demo — live recommendations not connected.</span>
      </header>
      <section className="hero" aria-labelledby="welcome-title">
        <div className="hero-copy">
          <p className="eyebrow">A small exchange in music taste</p>
          <h1 id="welcome-title">Your music.<br />Their world.<br /><em>A new way in.</em></h1>
          <p className="intro">Get to know someone through the artists they love. Two people, three favourites each, one device.</p>
          <button
            ref={startButtonRef}
            className="start-button"
            onClick={onStart}
          >
            Start a session <span aria-hidden="true">↗</span>
          </button>
          <p className="small-note">No accounts. No playback. Just discovery.</p>
        </div>
        <figure className="album">
          <div className="album-top"><span>BE / VOL. 01</span><span>FOR TWO</span></div>
          <div className="record" aria-hidden="true"><div className="record-label">SIDE A<br /><span>meet</span><br />SIDE B</div></div>
          <div className="album-title">Different favourites.<br /><em>Fresh perspectives.</em></div>
          <div className="signal-art"><IllosVectorSearch /></div>
          <figcaption>Decorative signal study · not a taste score</figcaption>
        </figure>
      </section>
      <ol className="liner-notes">
        <li><span>01 / BRING</span>Three artists that feel like you.</li>
        <li><span>02 / EXPLORE</span>An introduction to each other's taste.</li>
        <li><span>03 / RESPOND</span>Honest feedback. One fresh round.</li>
      </ol>
      <footer>Music is personal. Discovery is an invitation, not a compatibility test.</footer>
    </main>
  );
}
