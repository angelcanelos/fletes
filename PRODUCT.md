# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Inherited from the sibling project `../extraccion-app` (the working v1 of this same product): React 18 + Vite + Tailwind CSS on the frontend, Express + better-sqlite3 on the backend, optional Supabase backup sync. `fletes-v2` reuses the same backend/data layer and business-logic modules unchanged; this project only replaces the UI shell and screens. *(Inferred from the existing codebase, not asked — the user asked for a UI redesign of a working app, not a stack choice.)*

## Users

A single non-technical office secretary at Forestal Tezains, a Mexican forestry/logging company, who uses this daily on a desktop browser to create, save, and print two kinds of official paper business documents that used to be filled out by hand/typewriter.

## Product Purpose

Replace two handwritten/typewritten paper forms with a fast digital equivalent that still prints out looking exactly like the company's official paper originals: "Extracción de Trocería en Rollo" receipts (wood extraction, billed per grúa/crane crew) and "Flete de Madera en Rollo" receipts (freight/trucking of that wood, billed per fletero/hauler). Success is the secretary filling one out and printing it faster and with fewer arithmetic mistakes than by hand, without the printed page looking any different than before.

## Positioning

Not a generic invoicing tool — it is shaped exactly around this one company's two document types, its fixed catalogs (10 named grúas each with a fixed productor and precio_flete, a fleteros list, parajes, destinos, géneros), and its two official printed layouts, which must stay byte-identical to the physical originals. A generic invoicing SaaS could not reproduce those two exact printed formats or the per-grúa automatic pricing/grouping logic.

## Operating Context

One secretary, one desktop browser, real daily paperwork. Catalogs (grúas, fleteros, parajes, destinos, géneros) are self-administered in Ajustes rather than hardcoded. Saved documents are browsed "by folder" — one folder per grúa (Extracción) or per fletero (Fletes) — with search/filter as an alternative view. Documents can carry an optional set of +/- monetary "ajustes" (discounts or extra charges) on top of the base charge. Retención and ISR are optional per document. A flete can mix viajes from several different grúas in one document, each grúa billed at its own catalog price, grouped and subtotaled on the printed page. An optional background job can back up all data to Supabase when the secretary configures it in Ajustes.

## Capabilities and Constraints

- Two modules: Extracción and Fletes, each with: a list/folder dashboard, a create/edit form, a print view, and shared Ajustes/Catálogos.
- **Hard constraint carried over from v1, non-negotiable in this redesign:** the two printed receipts (rendered by `ReciboFormato.jsx` + `formato.css`, and `ReciboFlete.jsx` + `flete.css`) must remain pixel-identical to v1's output. This redesign only touches the app shell, navigation, dashboards, and form layouts around them.
- Spanish-only UI (`es-MX`), Mexican peso currency formatting.
- No user accounts/authentication today — single shared browser session, run locally for one user.
- Two distinct visual identities intentionally coexist: `LogoFletes.png` is this app's own branding (used in the UI chrome), while `logo.png` is the company's original logo used only inside the two printed receipts — this separation must not be collapsed.

## Brand Commitments

Name: **Forestal Tezains**. Existing logo assets already in `public/images/`: `logo.png` (the original company logo, printed-receipts only) and `LogoFletes.png` (the app's own square icon/branding, used in UI chrome — navbar/sidebar, window icon). Footer line "Forestal Tezains — Formato oficial 2026" appears on every screen in v1 and is a confirmed piece of copy.

## Evidence on Hand

- A complete, working reference implementation at `../extraccion-app` (same company, same data model, same two print formats) — read its `src/`, `db/`, and `server.js` as ground truth for behavior before changing any screen's logic.
- Real logo files under `public/images/`.
- No customer testimonials, pricing, or marketing claims apply — this is an internal single-tenant operations tool, not a sold product.

## Product Principles

1. The printed page is sacred. Every screen redesign decision yields to "does this still print exactly the same."
2. Built for one specific daily user doing one specific job, not a broad audience — optimize for zero-training clarity and speed over feature breadth or customization.
3. Catalogs over free text everywhere the business already has a fixed list, to keep the secretary from ever mistyping a grúa, fletero, paraje, destino, or género.
4. Every number on a printed total must be traceable on screen first — subtotals, per-grúa groups, and +/- ajustes are shown before they're committed to paper, never a black-box total.

## Accessibility & Inclusion

No accessibility standard was established for v1; none is introduced here beyond normal contrast/keyboard-focus hygiene applied during this redesign.
