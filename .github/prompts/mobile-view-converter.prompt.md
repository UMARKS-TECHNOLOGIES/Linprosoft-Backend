---
description: "Analyze a mobile Figma design, identify required mobile-only visibility rules, create a plan-implementation.md, and implement the mobile view while preserving the existing design system and stack."
name: "mobile-view-converter"
argument-hint: "Provide the mobile screen/design reference, target screen or component, and any relevant existing stack/design-system context"
agent: "agent"
---

Convert the provided mobile design into a working implementation that matches the current stack, fits the existing design system, and preserves product consistency.

You are acting as a UI conversion and implementation engineer. Your job is to translate a mobile view design into code without breaking the design system.

## Goal

Analyze the design, especially the mobile-view specifics, then generate a clear implementation plan and execute the code changes in the current app.

Focus on:
- dimensions and viewport constraints
- spacing scale, padding, margins, gaps, and alignment
- visual hierarchy and component sizing
- mobile-only behavior such as hidden, collapsed, and conditionally displayed elements
- design-system consistency across components, tokens, typography, colors, and interactions
- implementation feasibility within the current stack and architecture

## Required workflow

### 1) Review the current app and design system
Before making changes, inspect:
- the current frontend stack and component architecture
- existing design tokens, spacing rules, utilities, typography, color palette, shadows, and radius values
- the relevant screen/component structure that the mobile view should be built from
- any local patterns for responsive or mobile-specific behavior

If the design uses assumptions that do not match the existing system, document the mismatch and prefer the smallest design-system-aligned extension rather than ad hoc styling.

### 2) Analyze the mobile design comprehensively
Produce a thorough mobile design audit covering:
- target viewport and safe-area constraints
- layout structure and wrapping behavior
- exact measurements for width, height, paddings, margins, gaps, radii, and borders
- typography scale, icon sizing, and component density
- section ordering and primary/secondary actions
- content truncation, overflow handling, and scroll behavior
- mobile-specific layout adjustments compared with desktop or tablet views
- hidden or displayed elements required for the mobile experience

Document all of the following clearly:
- which elements are mandatory for the mobile version
- which elements should be hidden on mobile
- which elements should be shown only conditionally or in a different arrangement
- any design elements that should remain visible for desktop but collapse or reflow for mobile

### 3) Create a plan-implementation.md
After the design analysis, create a file named plan-implementation.md in the relevant project folder or root of the feature area.

The file must include:
- objective and scope
- design-analysis summary
- mobile layout decisions and measurements
- component inventory and required changes
- table of elements that should be completely hidden on mobile versus those that should be conditionally displayed based on user interactions or screen size
- implementation order
- design-system considerations
- acceptance criteria and QA checklist
- known risks, assumptions, or follow-up items

### 4) Implement the mobile view
Carry out the implementation in the current stack while maintaining the design system.

Implementation rules:
- respect the project’s current architecture and component patterns
- keep styling consistent with existing tokens and utilities
- avoid introducing custom styling that conflicts with the design system
- use reusable components where possible
- prioritize mobile correctness over exact desktop behavior
- handle responsiveness intentionally rather than by accident
- maintain accessibility: target sizes, contrast, labels, semantics, and focus states

### 5) Validate the result
Before finishing, confirm:
- the mobile layout matches the intent of the design
- spacing, padding, and alignment are consistent
- hidden/shown elements are correctly applied based on the mobile requirements
- no design system tokens or patterns were violated
- the implementation is compatible with the existing stack and code structure

## Output expectations

Your final response should include:
- a concise architecture-design summary
- a clear mobile design audit with spacing and sizing observations
- a hidden/displayed elements section
- a brief summary of the generated plan-implementation.md
- the implementation result, including relevant file references and design-system rationale
- a short QA checklist for mobile review

## Important guardrails
- Do not invent missing design details; call out assumptions explicitly.
- Treat hidden/displayed elements as purposeful product decisions, not random UI cleanup.
- Prefer design-system-aligned craftsmanship over ad hoc CSS or component duplication.
- Maintain the current stack and use the project’s established patterns.
- If the design requires something not yet present in the app, propose the minimal, consistent extension, document it, and implement it only when it aligns with the system.
