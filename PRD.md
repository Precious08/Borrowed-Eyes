# Borrowed Eyes — Product Requirements (v1)

Status: Phase 2 draft, implementation-ready  
Date: 24 October 2026  
Target: public hackathon demo, submission by 30 October 2026 (Africa/Lagos)

## 1. Product summary

Borrowed Eyes helps two people explore each other's music taste on one device. Each person confirms three favourite artists. The app returns a short introduction drawn from each person's taste plus a combined discovery section. Both people then respond independently to the suggestions, and one revision round uses that feedback.

v1 has no accounts, invitations, streaming, playback, or persistent profiles. A name or nickname is required for each person.

## 2. Goals and non-goals

**Goals**
- Make a two-person taste-exploration session understandable in under five minutes.
- Keep every suggestion traceable to a Qloo result and an input profile.
- Make disagreement useful without pretending it proves compatibility.
- Ship a mobile-first, accessible, low-cost demo.

**Non-goals**
- Accounts, remote invitations, sharing links, or multi-device sessions.
- Playback, streaming integration, playlist export, or syncing.
- Books, movies, places, brands, or any category other than artists.
- Compatibility scores, percentages, "mutual match" claims, or inferred musical relationships.

## 3. Users and session constraints

- Two people share one phone-sized browser.
- Each person selects exactly three confirmed artists from Qloo search results.
- Names or nicknames are required for both people (max 24 characters), trimmed and displayed as plain text. Identical names are allowed.
- Feedback is independent: Person B must not see Person A's answers before submitting.
- Same-device privacy is social, not cryptographic; the UI states this plainly.

## 4. Core journey

1. **Profiles:** Person A searches, selects, and confirms three artists; handoff screen; Person B does the same.
2. **Results:** Person A introduction (up to 4 artists), Person B introduction (up to 4), combined discovery (up to 6).
3. **Independent feedback:** Person A rates every displayed suggestion as **Interested**, **Already know**, or **Not for me**; handoff; Person B rates independently.
4. **One revision:** a single new combined list of up to 6 artists, with a plain-language summary of what feedback changed.

"Already know" means familiarity, not dislike. It is never counted as a negative preference.

## 5. Data model

```text
Session
  people[2]: { nickname, artists[3]: { entityId, name } }
  candidates[]: { entityId, name, imageUrl?, descriptionPresent, sources[] }
  feedback[2]: { [entityId]: "interested" | "known" | "not_for_me" }
  revisionCandidates[]
```

- Artist identity is `entity_id`; IDs are compared case-insensitively.
- Store only `entity_id`, `name`, optional image URL, description presence, and source provenance.
- Do not store or display raw Qloo response objects, affinity scores, popularity, tags, or biographies.
- Browser state lives in `sessionStorage`; no database and no server-side session store.

## 6. Candidate selection

### 6.1 Initial request plan

- Six single-artist requests: one per confirmed favourite, using the documented `GET /v2/insights` with `filter.type=urn:entity:artist`, `signal.interests.entities=<artistId>`, `take=10`.
- One combined request: all six IDs in `signal.interests.entities`, `take=10`.
- A three-ID profile request (one person's three artists in a single call) is **untested** and is not used in v1.
- Single-artist and two-artist combined requests are **tested**. Six-ID combined behavior and its aggregation rule are **not tested and not documented**.

**Each introduction considers all three of that person's artists.** Because a one-call three-ID profile request is untested, v1 issues three single-artist requests per person and merges their results; every card records which of the three anchors returned it, so no anchor is silently dropped. Request cost: 3 calls per person (6 total) plus 1 combined call = 7 initial recommendation calls; adding the revision makes 8 per session. The untested alternative would cost 2 profile calls plus 1 combined = 3 initial calls, but its multi-signal behaviour is not established.

Using separate single-artist requests for the introductions avoids depending on undocumented multi-signal aggregation for individual taste profiles.

### 6.2 Normalisation and exclusions

For every request:

1. Keep only artist results with a non-empty `entity_id` and `name`.
2. Drop any ID matching one of the six confirmed favourites.
3. Deduplicate by `entity_id`, preserving first-seen order.
4. Do not re-rank by affinity or popularity across requests.
5. Drop results with malformed IDs or missing names.

### 6.3 Merge and duplicate rules

- Each person's pool is the round-robin merge of that person's three single-artist pools, in the order the favourites were confirmed. All three anchors contribute; each card keeps the anchor ID(s) that returned it.
- Person introduction: take up to 4 unique artists.
- Combined section: take up to 6 from the combined pool, preferring IDs not already shown in either introduction.
- If fewer than 3 combined candidates are new, backfill from the combined pool with already-shown IDs, maximum 6 total, labelled "Also appeared in an introduction." Never invent or pad.
- If a request fails or returns too few valid results, show fewer cards and a scoped warning; do not claim the list is complete.
- Same display name with different IDs is not merged. Show both only if both survive ID deduplication; otherwise the first ranked result wins.
- Total initial cards are capped at 14.

## 7. Feedback and the single revision

Each person must rate every displayed candidate before continuing. Feedback is hidden from the other person.

Revision rules:

- **Not for me:** excluded from the revision list and described as excluded.
- **Already know:** not a dislike; excluded only to avoid repeating a familiar artist.
- **Interested:** eligible as one additional seed per person (maximum two extra seeds).
- **Unrated:** not possible in v1; all cards require a response.

One revision request only:

```text
GET /v2/insights
  filter.type=urn:entity:artist
  signal.interests.entities=<six favourites + up to two interested IDs>
  filter.exclude.entities=<all initially shown IDs>
  take=10
```

`filter.exclude.entities` is documented for artists but **not yet tested**. The revision displays up to 6 new artists. If fewer than 3 return, show what exists and an honest "no further suggestions under current limits" message. There is no second revision.

## 8. Honest explanations

Every card shows provenance, not inferred compatibility:

- Introduction: "Returned from [nickname]'s [favourite artist] signal."
- Multiple sources: list up to two anchors.
- Combined: "Returned when all six favourites were supplied as signals."
- Revision: "Returned after excluding previously shown artists; up to two Interested picks were added as signals."

Global result note:

> Qloo returns affinity-based suggestions, not predictions that either person will enjoy an artist. The method for combining multiple artist signals is not documented, so combined results do not prove mutual taste, equal influence, or a match.

Prohibited copy: compatibility percentages, "match score", "you both love", "shared taste confirmed", "because you both like X", genre claims not present in the returned data, and any statement that one person influenced a combined result more than the other.

## 9. Bounded agent workflow

The agent is a bounded orchestrator with an optional narration model. Tool selection, sufficiency evaluation, and feedback-driven action selection are required agent behaviour. It may not invent candidates or bypass these steps.

1. **Inspect profiles:** validate two profiles, exactly three artist IDs each, required names, and complete feedback on revision.
2. **Call Qloo tools:** allowlisted `searchArtist` and `recommendArtists` tools; fixed base URL, parameters, timeouts, and caps. No arbitrary URLs or free-form parameter injection.
3. **Evaluate sufficiency:** count unique, valid, non-favourite candidates; require at least 3 per introduction and 5 combined before calling the result "complete". Record partial failures.
4. **Select one follow-up action:** use the feedback decision table below.
5. **Return grounded suggestions:** candidate IDs/names from tool output only, with provenance and warnings. Drop any model-generated candidate not present in tool output.

| Feedback state | Allowed action |
|---|---|
| Any "Not for me" | Exclude those IDs; never re-present them |
| Any "Already know" | Do not treat as negative; exclude from repeat |
| One or more "Interested" | Add at most one per person to the revision seeds |
| No Interested, any negative/familiar | Re-query with the six favourites, excluding shown IDs |
| No ratings / incomplete | Do not call the revision; show validation |
| Fewer than 3 new revision results | Return fewer; no second attempt |
| 429 or quota error | Stop; show quota state; no retry loop |

**Model/runtime is unresolved.** A free model with reliable tool calling has not been verified. The agent's control flow — tool selection, sufficiency checks, and feedback-driven actions — is required and runs without an LLM. Deterministic copy templates are only the **explanation/narration fallback** when a model is unavailable; they do not replace tool selection or feedback handling. An LLM may only rewrite grounded copy after candidate selection; it cannot add names, genres, links, or relationships.

## 10. Mobile-first screens

| Screen | Purpose | Key states |
|---|---|---|
| Welcome | Explain the two-person session and privacy limit | Default |
| Person setup | Required name, search, select three, confirm | Searching, no results, selected, validation |
| Handoff | Pass device to the next person without showing prior answers | Default |
| Results | Introduction A, introduction B, combined discovery | Loading, partial, empty, error |
| Feedback A | Rate every card | Incomplete, saving, error |
| Handoff | Hide A's answers before B rates | Default |
| Feedback B | Rate every card independently | Incomplete, saving, error |
| Revision | New combined list plus change summary | Loading, fewer results, empty, quota |
| Restart | Clear session and start over | Confirmation |

Layout: single column, 16px base text, 44×44px minimum targets, sticky primary action within thumb reach, no horizontal scrolling at 320 CSS px.

## 11. Accessibility

Target WCAG 2.2 AA:

- Semantic headings, landmarks, lists, fieldsets, and labels.
- Keyboard-complete flow; visible focus; focus moves to the new screen heading.
- Feedback uses radio groups with a legend; state is never conveyed by colour alone.
- `aria-live` announcements for search counts, loading, errors, and revision status.
- 4.5:1 text contrast, 200% text resize, 320px reflow, reduced-motion support.
- Search results and cards expose artist name and source; decorative images use empty alt text; meaningful images use alt text.
- Errors are linked to the relevant field and described in plain language. No timed interactions.

## 12. Loading, empty, error, and quota states

- **Loading:** skeleton cards and status text; primary action disabled; no duplicate submits.
- **Empty:** "No suggestions returned for these artists" with retry/back; never fabricate results.
- **Partial:** render successful sections; mark failed sections and offer one retry.
- **Error:** generic message plus request ID; no raw API body, headers, or key material.
- **Quota/429:** "Demo limit reached; try again later"; no automatic retry loop.
- **Offline:** detect and explain; keep the current screen.
- **Image failure:** initials/placeholder; name and controls remain usable.
- **Timeout:** 10 seconds per Qloo call; one retry only for timeout/5xx.

## 13. Security, privacy, and retention

- The Qloo key exists only in backend environment secrets. It is never sent to the browser, embedded in bundles, logged, or included in errors.
- Backend exposes only fixed operations: search artists and get recommendations. No open proxy.
- Validate: required name or nickname ≤24 chars, query 2–80 chars, artist IDs match the documented UUID format, exactly three per person, feedback keys belong to returned candidates, body ≤8 KB.
- Same-origin CORS, CSP, `X-Content-Type-Options`, `Referrer-Policy`, and frame-ancestors restrictions.
- Rate limit per session and per transient IP. Do not persist IPs; counters expire within 24 hours.
- No analytics, advertising pixels, cookies, accounts, or third-party trackers.
- Session state is `sessionStorage`; restart clears it. Backend is stateless and does not retain raw Qloo responses.
- Logs contain method, status, latency, and a random request ID only. No key, nickname, artist ID, feedback, or response body.
- Phase 1 raw test responses remain in the ignored `responses/` folder and are not part of the product or documentation.

## 14. Request caps and $0 infrastructure

Default caps (configurable, tune only after quota is confirmed):

- 12 searches per session; debounce 350 ms; minimum 2 characters; 8 results per search.
- 7 recommendation calls for the initial result (3 single-artist calls per person + 1 combined), 1 revision call; 20 Qloo calls per session maximum including retries.
- At most one retry per failed call, only for timeout/5xx; never retry 401/403/429.
- 20 sessions per IP per day; 1,500 global Qloo calls per day; hard-stop with a quota state.
- Recommendation `take=10`; no pagination in v1.

Infrastructure: static frontend plus a stateless serverless API on a free tier (proposed: Cloudflare Pages + Workers, free subdomain). No database, queue, paid model, or custom domain. Production secrets use the platform's secret store.

**Ongoing free Qloo access after hackathon judging is unconfirmed.** The demo must be shippable during the judging window; do not promise a permanent public service.

## 15. Verified versus proposed

| Capability | Status |
|---|---|
| Artist search by name | Verified in Phase 1 |
| Single-artist recommendations (`take=10`) | Verified in Phase 1 |
| Two-artist combined request | Verified; aggregation rule undocumented |
| Three-ID profile request (one person's three artists in one call) | Not tested; not used in v1 |
| Six single-artist intro requests plus deterministic merge | API calls tested individually; merge logic proposed |
| Six-ID combined request | Documented list input; not tested at six IDs |
| `filter.exclude.entities` for revision | Documented for artists; not tested |
| 429/quota behavior | Not tested |
| Qloo image hotlinking/CORS from deployment host | Not tested |
| Free agent model with reliable tool calling | Unresolved |
| Free Qloo access after judging | Unconfirmed |

Phase 1 evidence: search, single-artist recommendations, and two-artist combined requests succeeded. The Burna Boy / Stevie Wonder test produced distinct individual top-10 lists with no overlap and a mixed combined list. This demonstrates API behavior only; it does not prove mutual enjoyment, equal signal influence, or any musical relationship.

## 16. Acceptance criteria

- Two people can complete the full journey on a 320px-wide screen without an account.
- Each person confirms exactly three artists from search results; duplicates and favourites are excluded from suggestions.
- Each introduction shows 3–4 grounded cards or an honest partial state; combined shows 5–6 or an honest partial state.
- Every card has provenance; no compatibility percentage or mutual-match claim appears anywhere.
- Both people rate all cards independently; A's answers are not visible to B before submission.
- Exactly one revision occurs; "Already know" is not treated as dislike; no second revision.
- All loading, empty, partial, error, offline, image-failure, and quota states are implemented.
- Keyboard-only and screen-reader walkthrough passes; axe scan has no serious/critical violations.
- Qloo key is absent from client bundles and logs; secret scan passes.
- Request caps and timeouts are enforced; a session stays within the documented call budget.
- Production has no database and no raw response retention; session state clears on restart.
- Deployment runs on $0 infrastructure and the public demo URL is reachable.

## 17. Out of scope for v1

Accounts, remote invitations, share links, multi-device sessions, streaming authentication, playback, playlist syncing, saved history, social feeds, chat, other cultural categories, compatibility scoring, and persistent analytics.
