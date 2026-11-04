import { useEffect, useRef } from "react";
import type { ArtistRef } from "../types";
import { BackButton } from "./BackButton";

interface SelectionSummaryProps {
  names: readonly [string, string];
  selections: readonly [readonly ArtistRef[], readonly ArtistRef[]];
  onBack: () => void;
  onContinue: () => void;
}

export function SelectionSummary({ names, selections, onBack, onContinue }: SelectionSummaryProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <section className="summary" aria-labelledby="summary-title">
    <div className="step-row">
      <BackButton onClick={onBack} />
      <p className="eyebrow">The session / Selection summary</p>
    </div>
    <h1 id="summary-title" ref={heading} tabIndex={-1}>Your selections.<br /><em>Two perspectives.</em></h1>
    <p className="intro">Three artists each. Your choices stay here while you go back and edit.</p>
    <div className="summary-grid">{selections.map((artists, index) => <section className="summary-card" key={index} aria-labelledby={`summary-person-${index}`}>
      <p className="side">Side {index === 0 ? "A" : "B"}</p>
      <h2 id={`summary-person-${index}`}>{names[index]} <span className="selection-count">3 / 3</span></h2>
      <ol className="sleeve-grid summary-sleeves" aria-label={`${names[index]}'s selected artists`}>
        {artists.map((artist, artistIndex) => (
          <li className="sleeve sleeve-filled" key={artist.entityId}>
            <span className="sleeve-art" aria-hidden="true" />
            <span className="sleeve-index">0{artistIndex + 1}</span>
            <span className="sleeve-name">{artist.name}</span>
          </li>
        ))}
      </ol>
    </section>)}</div>
    <p className="setup-note">Selection complete. Both perspectives are ready.</p>
    <div className="selection-actions">
      <button className="start-button" onClick={onContinue}>View discoveries →</button>
    </div>
  </section>;
}
