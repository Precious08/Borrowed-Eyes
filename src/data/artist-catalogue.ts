import type { ArtistRef } from "../types";

// Curated local selection data, independent of synthetic recommendation fixtures.
// Qloo IDs below were confirmed by Phase 1 requests. local: IDs are NOT Qloo IDs
// and must be resolved before any future live recommendation request.
type CatalogueArtist = ArtistRef & { readonly idSource: "verified-qloo" | "local" };

export const artistCatalogue: readonly CatalogueArtist[] = [
  { name: "Burna Boy", entityId: "4A322BDD-04A3-4369-8234-B38A7FB485D9", idSource: "verified-qloo" },
  { name: "Stevie Wonder", entityId: "DFA0C571-5ADC-45CA-BA33-1AF68C698CA2", idSource: "verified-qloo" },
  { name: "Wizkid", entityId: "C510E01A-E17C-45FC-8DCE-64A963A121A4", idSource: "verified-qloo" },
  { name: "Tems", entityId: "A78C19AA-DF8B-4D1C-9120-0F39041BA590", idSource: "verified-qloo" },
  { name: "Rema", entityId: "28EF796E-D7E8-42AC-BF59-414359E4E7B4", idSource: "verified-qloo" },
  { name: "Marvin Gaye", entityId: "7C7B2D3A-FE7E-4507-8D00-183671B5177D", idSource: "verified-qloo" },
  { name: "Aretha Franklin", entityId: "97053D92-D12F-4AD0-8E85-89037806B85F", idSource: "verified-qloo" },
  { name: "Bill Withers", entityId: "358721A5-84E3-4745-B24B-80BB5FE2EB9D", idSource: "verified-qloo" },
  { name: "Fela Kuti", entityId: "local:fela-kuti", idSource: "local" },
  { name: "Sade", entityId: "local:sade", idSource: "local" },
  { name: "Beyoncé", entityId: "local:beyonce", idSource: "local" },
  { name: "Nina Simone", entityId: "local:nina-simone", idSource: "local" },
  { name: "Kendrick Lamar", entityId: "local:kendrick-lamar", idSource: "local" },
  { name: "Adele", entityId: "local:adele", idSource: "local" },
  { name: "Daft Punk", entityId: "local:daft-punk", idSource: "local" },
  { name: "Radiohead", entityId: "local:radiohead", idSource: "local" },
];
