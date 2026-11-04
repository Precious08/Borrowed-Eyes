import { useEffect, useRef, useState } from "react";
import type { ArtistRef, PersonId } from "../types";
import { artistCatalogue } from "../data/artist-catalogue";
import { BackButton } from "./BackButton";

interface ArtistSelectionProps {
  personId: PersonId;
  name: string;
  selected: readonly ArtistRef[];
  onChange: (artists: readonly ArtistRef[]) => void;
  onBack: () => void;
  onContinue: () => void;
}

// Both people browse the same catalogue; uniqueness applies per person only.
const catalog = artistCatalogue.filter((artist, index, all) =>
  all.findIndex(item => item.entityId.toLowerCase() === artist.entityId.toLowerCase()) === index);

export function ArtistSelection({ personId, name, selected, onChange, onBack, onContinue }: ArtistSelectionProps) {
  const [query, setQuery] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [announcement, setAnnouncement] = useState("");
  const complete = selected.length === 3;
  const results = catalog.filter(artist => artist.name.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => { heading.current?.focus(); }, []);

  function add(artist: ArtistRef) {
    if (selected.length >= 3 || selected.some(item => item.entityId.toLowerCase() === artist.entityId.toLowerCase())) return;
    onChange([...selected, artist]);
    setAnnouncement(`${artist.name} added. ${selected.length + 1} of 3 selected.`);
  }

  function remove(artist: ArtistRef) {
    onChange(selected.filter(item => item.entityId !== artist.entityId));
    setAnnouncement(`${artist.name} removed. ${selected.length - 1} of 3 selected.`);
    search.current?.focus();
  }

  return <section className="selection" aria-labelledby="selection-title">
    <div className="step-row">
      <BackButton onClick={onBack} />
      <p className="eyebrow">Side {personId.toUpperCase()} / Person {personId === "a" ? "1" : "2"} of 2</p>
    </div>
    <h1 id="selection-title" ref={heading} tabIndex={-1}>{name},<br /><em>pick your three.</em></h1>
    <p className="intro">Browse real artists in this local catalogue or filter by name. You can both choose the same artists.</p>
    <p className="visually-hidden" role="status">{announcement}</p>
    <div className="selection-grid">
      <section aria-labelledby="selected-title" className="selected-panel">
        <h2 id="selected-title">Your three <span className="selection-count">{selected.length} / 3</span></h2>
        <ol className="sleeve-grid" aria-label={`${name}'s three artist slots`}>
          {[0, 1, 2].map(index => {
            const artist = selected[index];
            return (
              <li key={index} className={artist ? "sleeve sleeve-filled" : "sleeve sleeve-empty"}>
                <span className="sleeve-art" aria-hidden="true" />
                <span className="sleeve-index">0{index + 1}</span>
                {artist ? (
                  <>
                    <span className="sleeve-name">{artist.name}</span>
                    <button className="remove-button" onClick={() => remove(artist)} aria-label={`Remove ${artist.name}`}>Remove</button>
                  </>
                ) : (
                  <span className="sleeve-name sleeve-placeholder">Open slot</span>
                )}
              </li>
            );
          })}
        </ol>
        {selected.length === 0 && <p>No artists selected yet. Add your first from the catalogue.</p>}
        <p id="selection-requirement">{complete ? "Three selected. Remove one to choose a different artist." : `Choose ${3 - selected.length} more ${selected.length === 2 ? "artist" : "artists"} to continue.`}</p>
      </section>
      <section className="search-panel" aria-labelledby="catalog-title">
        <h2 id="catalog-title">Local catalogue</h2>
        <label htmlFor="artist-search">Filter artists</label>
        <input ref={search} id="artist-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="e.g. Burna Boy" autoComplete="off" />
        <p className="catalog-count" role="status">{results.length} {results.length === 1 ? "artist" : "artists"} shown</p>
        {results.length === 0 ? <div><p>No local artists match “{query}”.</p><button className="text-button" onClick={() => { setQuery(""); search.current?.focus(); }}>Clear filter</button></div> :
          <ul className="results-list">{results.map(artist => {
            const added = selected.some(item => item.entityId.toLowerCase() === artist.entityId.toLowerCase());
            return <li key={artist.entityId}><button className="result-item" aria-disabled={added || complete} aria-label={`${added ? "Selected" : "Add"} ${artist.name}`} onClick={() => add(artist)}><span>{artist.name}</span><span className="result-action">{added ? "Selected ✓" : "Add +"}</span></button></li>;
          })}</ul>}
      </section>
    </div>
    <div className="selection-actions"><button className="start-button" disabled={!complete} aria-describedby="selection-requirement" onClick={() => { if (complete) onContinue(); }}>Continue → {personId === "a" ? "Person B's turn" : "Selection summary"}</button></div>
  </section>;
}
