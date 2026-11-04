# Borrowed Eyes — Phase 2 Plan

Deadline: **30 October 2026, Africa/Lagos (UTC+1)**  
Internal deploy freeze: **29 October 2026, 18:00 WAT**  
Submission target: **30 October 2026, 12:00 WAT**  
Final day is reserved for regression testing and submission; no new features.

## Build order

1. Interface with labelled fixtures.
2. Live Qloo integration and bounded agent.
3. Quality, security, and cost checks.
4. Public deployment and submission.

## Timeline

| Date | Work | Output / gate |
|---|---|---|
| **Oct 24** | Freeze PRD and plan; define types, service interface, fixture schema, acceptance checks | PRD.md, PHASE_PLAN.md, implementation contract; no UI or API calls |
| **Oct 25** | Build mobile-first interface against labelled fixtures; all screens, states, feedback flow, revision, accessibility | Fixture-driven two-person journey passes; fixture data visibly labelled; no live Qloo dependency |
| **Oct 26** | Live backend proxy: search, six single-artist calls, one combined call, normalisation, dedupe, caps, redaction, failure states | Live happy path passes; key stays server-side; call budget enforced |
| **Oct 27** | Bounded agent orchestration and revision; optional narration model only if free access and tool support verified | Feedback decision table and one revision pass; deterministic fallback works |
| **Oct 28** | Quality, security, and cost gates; accessibility audit; quota/error simulation; secret scan | All release checks pass or are explicitly waived |
| **Oct 29** | Deploy public demo on $0 tier; production secrets; smoke tests; submission draft | Public URL live; submission draft complete |
| **Oct 30** | Final regression, accessibility spot check, submission | Submit by 12:00 WAT; remainder is buffer |

## Phase A — Interface with labelled fixtures (Oct 25)

Build the full two-person journey before touching live Qloo data.

- Define a `RecommendationService` boundary so fixture and live adapters are interchangeable.
- Create synthetic fixtures, clearly marked `fixture: true`: happy path, no overlap, partial failure, empty results, insufficient candidates, 429/quota, timeout, image failure.
- Never copy raw Phase 1 Qloo responses into fixtures or documentation; fixture artist names and IDs are synthetic or clearly labelled test data.
- Show a persistent "Demo data" badge whenever the fixture adapter is active.
- Implement: welcome, two profile steps, handoffs, results, independent feedback, revision, restart.
- Implement all loading, empty, partial, error, offline, image-failure, and quota states.
- Enforce feedback completeness and answer hiding between people.
- Add accessibility foundations: focus management, live regions, radio-group feedback, 44px targets, 320px reflow, contrast.

**Gate A:** A keyboard-only user can complete both profiles, both feedback rounds, and the revision using fixture data; no live API call is made; no fixture card is presented as a real Qloo result.

## Phase B — Live integration and agent (Oct 26–27)

### B1. Backend integration

- Serverless endpoints: `POST /api/search`, `POST /api/recommendations`, `GET /api/health`.
- Fixed Qloo base URL `https://hackathon.api.qloo.com`; documented `X-Api-Key` header; no client-side Qloo calls.
- Search: `GET /search?query=<text>&types=urn:entity:artist&take=8`.
- Initial recommendations: six single-artist `/v2/insights` calls (three per person; every selected artist contributes to that person's introduction) plus one combined call with all six IDs; `take=10`. Cost: 7 calls. A one-call three-ID profile request per person (2 calls total) is **untested** and is not used in v1; six calls are the deliberate tradeoff.
- Revision: one combined call with six favourites plus at most two Interested IDs; `filter.exclude.entities` set to all previously shown IDs; `take=10`.
- Normalise to the PRD data model; strip raw properties, affinity, popularity, tags, and biographies before returning to the client.
- Enforce the PRD request caps, 10-second per-call timeout, one retry only for timeout/5xx, and no retry on 401/403/429.
- Redact key material and raw upstream bodies from every error path and log.
- Use the tested single-artist path for introductions; all three anchors contribute through the round-robin merge. Do not silently rely on undocumented multi-signal aggregation for per-person taste or combined results.

**Gate B1:** Live happy path returns 14 initial candidates and up to 6 revision candidates within the session call budget; the browser bundle and logs contain no Qloo key; 429, timeout, and partial-failure states are exercised with mocks or controlled requests.

### B2. Bounded agent

- Implement the PRD state machine: inspect profiles, call tools, evaluate sufficiency, choose one follow-up action, return grounded suggestions.
- Tool allowlist only: `searchArtist`, `recommendArtists`. No arbitrary URLs, parameters, or recursive loops.
- Reject any model-proposed candidate not present in tool output.
- Deterministic templates are the **explanation fallback only**. Tool selection, sufficiency evaluation, and feedback-driven actions remain required agent steps and run without an LLM. Use an LLM narrator only after verifying free access, tool calling, latency, and acceptable rate limits.
- Copy must preserve provenance and the combined-signal disclaimer; no compatibility language.
- Feedback mapping: Not for me = exclude; Already know = familiar, exclude from repeat only; Interested = at most one extra seed per person; no ratings = do not revise.

**Gate B2:** With the narration model disabled, the agent still performs tool selection, sufficiency checks, and the feedback-driven revision; only explanation copy is templated. With a model enabled, adversarial prompts cannot add candidates, change provenance, invent genres, or produce a match percentage.

## Phase C — Quality, security, cost (Oct 28)

### Quality

- Unit: ID normalisation, dedupe, round-robin merge, section caps, backfill labels, feedback rules, revision seed selection, call counters.
- Contract: backend response schema against the fixture schema; no raw Qloo fields leak.
- Integration: live search, live recommendations, simulated 400/401/403/429/500/timeout.
- End-to-end: two-person happy path, no-overlap case, partial results, empty results, quota stop, restart.
- Accessibility: axe scan plus manual keyboard and screen-reader pass; verify focus, announcements, contrast, reflow, and reduced motion.
- Content audit: no percentages, "match", "both love", equal-influence claims, or invented relationships.

### Security

- Secret scan of client bundle, repository, logs, and error strings.
- Validate body size, query length, nickname length, artist ID format, exactly three artists per person, and feedback keys.
- Confirm no open proxy, no raw upstream error passthrough, same-origin CORS, CSP, and security headers.
- Confirm rate-limit counters are transient and IPs are not persisted.
- Confirm no raw Qloo responses are stored in production; `responses/` remains ignored test material.

### Cost

- Measure Qloo calls per session: target 7 initial + 1 revision + up to 12 searches; hard cap 20.
- Verify global daily cap, per-IP session cap, and quota UI.
- Confirm hosting, serverless, and model fallback all remain $0.
- Document that free Qloo access after judging is unconfirmed.

**Gate C:** All critical/high security and accessibility findings closed; no call path can exceed the session cap; cost estimate remains $0 under expected demo traffic.

## Phase D — Public deployment and submission (Oct 29)

- Deploy static frontend and stateless API to the free tier; use the free platform subdomain.
- Set the Qloo key only in the production secret store; verify the client bundle does not contain it.
- Enable production rate limits, security headers, and request logging limited to status/latency/request ID.
- Run the full acceptance checklist against the public URL on a phone-sized viewport and a desktop browser.
- Capture submission screenshots and concise demo copy; do not include raw Qloo responses or credentials.
- Draft the submission early; leave final submission for Oct 30.

**Gate D:** Public URL is reachable, the complete two-person journey works, and the submission draft is ready.

## Final day — Oct 30 (reserve)

- 09:00 WAT: regression on the public URL; verify quotas, error states, and accessibility spot checks.
- 10:30 WAT: freeze code; no new features.
- 11:00 WAT: final submission review against acceptance criteria.
- 12:00 WAT: submit.
- Afternoon: buffer for platform or submission issues.

## Acceptance checklist

- [ ] Two people, optional nicknames, exactly three confirmed artists each.
- [ ] Search, selection, confirmation, and duplicate prevention work.
- [ ] Six favourite IDs are excluded from all suggestions.
- [ ] Introductions show 3–4 grounded cards each, or an honest partial state.
- [ ] Combined discovery shows 5–6 cards, or an honest partial state.
- [ ] Every card names its source; combined disclaimer is visible.
- [ ] No compatibility percentage, match label, or mutual-enjoyment claim.
- [ ] Both feedback rounds are independent and hidden from the other person.
- [ ] All three feedback options work; Already know is not treated as dislike.
- [ ] Exactly one revision; no second revision; fewer results are shown honestly.
- [ ] Loading, empty, partial, error, offline, image-failure, and 429 states work.
- [ ] Keyboard-only and screen-reader walkthrough pass; axe has no serious/critical issues.
- [ ] Key is server-side only; secret scan passes.
- [ ] Request caps and timeouts are enforced; no retry on 429.
- [ ] No database, no raw response retention, session clears on restart.
- [ ] Public demo runs on $0 infrastructure.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Qloo access after judging is unconfirmed | Treat as a judging-window demo; state the limitation; no permanent-service promise |
| Free agent model/tool support unresolved | Ship deterministic orchestration and templates; model is optional narration only |
| Combined-signal aggregation undocumented | Label as combined-signal suggestions; never claim mutual taste or equal influence |
| Six-ID combined request untested | Test on Oct 26; if unstable, show a scoped failure instead of inventing a merge |
| `filter.exclude.entities` untested | Test early on Oct 26; fallback to not showing a revision rather than repeating cards silently |
| Qloo quota/429 during judging | Session/global caps, no retry loop, clear quota state |
| Image hotlinking/CORS issues | Placeholder fallback; verify early; never block names or feedback on images |
| Same-device privacy | Explicit privacy note; hide feedback between people; no accounts promised |
| Schedule slip | Oct 29 freeze; Oct 30 reserved for testing/submission only |

## Immediate next task

Create the synthetic fixture schema and the `RecommendationService` interface, plus one labelled happy-path fixture. No UI framework installation, live API calls, or credential access.
