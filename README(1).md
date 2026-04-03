# Graft/FPV Bundle

This bundle consolidates the work from the conversation into one starter repo structure for Claude Code.

## What this contains
- Master brief
- Canonical part library seed
- Build templates
- Lookup logic
- Build detection logic
- Gemini prompt builders
- Inventory model docs + helper logic
- Review queue docs + React component
- Transaction / shipment / payment future-proofing
- Supabase SQL starter schemas

## Core rule
AI suggests. Library resolves. User confirms. Only confirmed data becomes truth.

## Product shape
scan/listing -> suggestion -> review -> inventory -> deck -> swap -> transaction -> shipment

## Important constraints
- Do not skip review and save raw AI guesses as truth.
- Do not overbuild exact visual recognition.
- Do not build escrow / guarantees first.
- Keep shipping and payment future-proofed but optional.
