# PayResolve AI — Product Requirements Document (PRD)

**Document type:** Product Requirements Document
**Product:** PayResolve AI — Agentic Payment Operations Investigation Platform
**Status:** Draft for review
**Audience:** Head of Product, Head of Engineering, Payment Operations leadership
**Version:** 1.2 (pre-implementation)
**Owner:** Product Architecture
**Last updated:** 30 June 2026

> **Purpose of this document.** This PRD defines *what* PayResolve AI is and *why* it exists, in enough detail that a downstream Functional Specification and engineering implementation can proceed without re-deriving product intent or making silent assumptions. It deliberately contains no implementation detail, API design, data schema, or UI markup. Those belong to later documents in the specification series.

### Version history
| Version | Date | Summary |
|---|---|---|
| 1.0 | 30 Jun 2026 | Initial 12-section PRD. |
| 1.1 | 30 Jun 2026 | Added Product Principles, Why Agentic AI, Navigation Rules, Product Constraints, Product State Model, Product Events, AI Behaviour Principles, Error States, Non-Functional Requirements, and Acceptance Principles. Renumbered sections accordingly. |
| 1.2 | 30 Jun 2026 | Refinement pass: reframed category and case counts as MVP constraints with a scalable architecture; added the Product Differentiators section; varied "human-in-the-loop" phrasing for readability. No requirements removed; sections renumbered to accommodate the new section. |

### Contents
1. Product Vision
2. Product Principles
3. Why Agentic AI
4. Product Differentiators
5. Problem Statement
6. Business Goals
7. Target Users
8. User Personas
9. User Journey
10. Navigation Rules
11. Product Scope
12. Out of Scope
13. Core Concepts
14. Product Constraints
15. Product State Model
16. Product Events
17. AI Behaviour Principles
18. Error States
19. High-Level Product Architecture
20. Non-Functional Requirements
21. Success Metrics
22. Acceptance Principles
23. Risks and Assumptions

---

## 1. Product Vision

PayResolve AI is an internal enterprise web application that transforms payment authorization failure investigation from a slow, manual, analyst-driven activity into a fast, evidence-based, AI-augmented workflow.

Today, when payments fail to authorize — declined for insufficient funds, blocked by 3-D Secure authentication, rejected with a generic "Do Not Honor," or lost to an unavailable issuer — payment operations teams investigate them reactively, one spreadsheet and one log query at a time. The knowledge of *why* failures cluster, *how much revenue* they cost, and *what to do* about them lives in the heads of a few senior analysts.

PayResolve AI's vision is to make that expertise systematic, repeatable, and instantly available. The platform groups related authorization failures into **investigation cases**, then deploys a coordinated team of **specialized AI agents** that classify the failure pattern, determine the most likely root cause, quantify the revenue at stake, and recommend concrete recovery actions. A human analyst remains the decision-maker at every step — reviewing, approving, overriding, or escalating — while the AI removes the manual labor of gathering evidence and reasoning over it.

The end state we are building toward: a payment operations team that resolves authorization issues in minutes instead of days, recovers measurable lost revenue, continuously improves authorization rates, and can explain every decision with a clear, auditable evidence trail.

This is an **augmentation product, not an automation product**. Its success is measured by how much better human teams perform with it — not by how many humans it removes.

---

## 2. Product Principles

These principles are the non-negotiable design rules of the product. They take precedence over convenience and over individual feature requests, and they directly constrain implementation. Every later document and every engineering decision must conform to them. (Several map directly to the technical guarantees in Sections 14–16.)

**Principle 1 — One Case = One Investigation.** Each investigation case has exactly one investigation. A case is never split across multiple investigations, and an investigation never spans multiple cases. The case is the container; the investigation is its single analytical process.

**Principle 2 — One Investigation = One Source of Truth.** An investigation has a single authoritative representation that every part of the product reads from. There is no second, parallel, or derived copy of investigation state that can drift out of sync.

**Principle 3 — AI Assists, Human Decides.** The AI performs evidence collection, reasoning, analysis, and recommendation. The human renders every final decision. No case outcome is ever finalized by the AI alone.

**Principle 4 — Evidence Before Conclusions.** No conclusion (classification, root cause, impact, recommendation) is presented without the supporting evidence behind it. Evidence is produced first and is always inspectable; conclusions are derived from it, never asserted ahead of it.

**Principle 5 — Every Recommendation Must Be Explainable.** Every recommended action carries its reasoning, its supporting evidence, and its confidence. A recommendation a human cannot interrogate is not acceptable.

**Principle 6 — No Screen Maintains Independent Investigation State.** No screen, view, or component keeps its own private copy of the investigation. Screens are renderers of the single shared investigation state, not owners of it.

**Principle 7 — Every User Action Updates the Entire Application State.** State changes are global and coherent. When a user takes a meaningful action (e.g., selects a case), the whole application updates from the single source of truth — never one panel at a time, never leaving stale state behind.

---

## 3. Why Agentic AI

PayResolve AI is deliberately an **agentic** system, not a single large-language-model call that emits a report. This distinction is central to the product's identity and its value.

Instead of one model generating one answer, PayResolve AI orchestrates a team of **specialized agents that collaborate like a real payment operations team**. Each agent owns a specific responsibility — classification, root cause, recovery, revenue impact, executive summarization — under a Manager Agent that coordinates the work. The outputs of each agent are consumed and checked by downstream agents, so reasoning is built up in stages rather than produced in a single opaque leap.

This design produces four properties a single-model approach cannot reliably deliver:

**Division of expertise.** Each agent is scoped to one analytical job, mirroring how specialists on a payment ops team divide work. Responsibilities are clear, and each step can be reasoned about and improved independently.

**Accumulating, inspectable evidence.** Evidence is gathered and carried forward through the investigation. Because each agent must ground its work in what came before, the evidence trail accumulates and stays visible, rather than being hidden inside one generation.

**Reviewability and consistency.** Downstream agents review upstream outputs, and the Manager Agent validates overall consistency. Contradictions and gaps are caught within the system before a human ever sees them.

**Human supervision, not human execution.** The analyst supervises an investigation that the agent team carries out, rather than personally executing every analytical step. This is what lets the product cut investigation time dramatically while keeping the analyst accountable and in control.

In short: **PayResolve AI replaces "one LLM, one report" with a supervised, collaborating team of agents whose work is specialized, evidence-grounded, mutually reviewed, and inspectable.** That is what makes it Agentic AI, and it is the core of the product's differentiation.

---

## 4. Product Differentiators

PayResolve AI is not a re-skin of an existing category of enterprise software. Reviewers, implementers, and stakeholders should first understand what the product is *not*, because each adjacent category captures only a fragment of what PayResolve AI does — and building it as if it were one of them would miss the point.

PayResolve AI is **not**:

- **A dashboard.** A dashboard reports the state of the world and stops there; it surfaces numbers but does no investigation, produces no reasoning, and reaches no decision. PayResolve AI uses monitoring only as an entry point into investigation.
- **A BI tool.** Business intelligence lets a user slice and explore historical data to answer questions they already know how to ask. It does not determine root cause, recommend action, or quantify recovery opportunity on its own. PayResolve AI performs the analysis, not just the visualization.
- **A case management system.** Traditional case management tracks the status and ownership of work items but leaves the analytical work entirely to the human. PayResolve AI carries out the investigation itself and brings the human in to decide.
- **A ticketing system.** Ticketing routes and records requests; it has no domain reasoning and no concept of evidence-backed conclusions. PayResolve AI's cases are investigations with findings, not tickets with statuses.
- **A chatbot.** A chatbot is a conversational front-end that answers prompts. PayResolve AI is a structured, multi-stage investigation workflow with defined agents, evidence, decisions, and reporting — not a free-form conversation.
- **A generic LLM interface.** A generic LLM interface exposes a single model to a single prompt and returns a single, unverified answer. PayResolve AI orchestrates specialized agents that review one another's work, ground every claim in evidence, and submit conclusions for human approval.

What makes PayResolve AI distinct is that it **unifies capabilities that are normally separate products into a single payment operations platform**:

- **Operational Monitoring** — seeing where authorization failures are concentrating.
- **Investigation Queue** — turning concentrations of failures into prioritized, workable cases.
- **Multi-Agent AI** — a collaborating team of specialized agents that investigates each case.
- **Evidence-Based Reasoning** — every conclusion grounded in inspectable evidence.
- **Human Decision Workflow** — analyst approval, override, or escalation on every case.
- **Executive Reporting** — an executive-ready summary produced from the investigation.
- **Audit Trail** — a retained, defensible record of evidence and decisions.

Individually, each of these maps to a tool an enterprise might already own. The differentiation is in the **combination**: PayResolve AI takes a failure pattern all the way from detection, through prioritization, automated multi-agent investigation, evidence-grounded reasoning, and human decision, to executive reporting and an audit trail — in one continuous, governed workflow. No single category of existing software spans that whole path, and stitching several tools together loses the single source of truth, the evidence continuity, and the human-decision governance that make the result trustworthy. That end-to-end unification, purpose-built for payment authorization operations, is what makes PayResolve AI a differentiated enterprise product rather than an incremental feature on top of an existing one.

---

## 5. Problem Statement

Payment authorization failures are a large, persistent, and under-managed source of lost revenue and operational cost for payment processors, acquiring banks, gateways, and large merchants.

**The core problems we are solving:**

**Investigation is manual and slow.** Analysts manually pull transaction logs, cross-reference issuer behavior, check 3DS authentication results, and piece together what happened. A single meaningful investigation can take hours to days, and the process does not scale with transaction volume.

**Root causes are hard to isolate.** A spike in declines may stem from an issuer outage, a misconfigured 3DS flow, a BIN-specific risk rule, an expired-card cohort, or a genuine funding problem on the cardholder side. These causes look similar in raw decline data and require expert reasoning to separate.

**Business impact is invisible at the moment of decision.** Analysts can see *that* transactions failed, but rarely *how much* recoverable revenue a given failure pattern represents, or which patterns are worth prioritizing. Prioritization is driven by intuition rather than quantified impact.

**Knowledge is concentrated and non-repeatable.** The reasoning that turns raw declines into an action ("retry these, route those to a different issuer, escalate this to the 3DS vendor") is tacit expertise held by a few senior people. It is not codified, so investigations are inconsistent and onboarding is slow.

**Reporting is an afterthought and labor-intensive.** Translating an investigation into an executive-ready summary — what happened, what it cost, what we recommend — is manual, inconsistent, and often skipped, which weakens the feedback loop to leadership and to the teams that own fixes.

**The consequence:** authorization rates stay lower than they could be, recoverable revenue leaks continuously, resolution is reactive, and operational effort scales linearly with payment volume. PayResolve AI exists to break that pattern.

---

## 6. Business Goals

PayResolve AI is justified by operational and financial outcomes for the organizations that deploy it. The business goals, in priority order:

**Goal 1 — Reduce manual investigation effort.** Cut the analyst time required to investigate an authorization-failure case by a substantial margin, shifting analyst time from evidence-gathering toward decision-making and high-judgment escalation.

**Goal 2 — Recover lost revenue.** Surface and quantify recoverable revenue inside failed-authorization patterns, and drive recovery actions (intelligent retries, routing changes, configuration fixes, issuer escalations) that convert a meaningful share of failed authorizations into successful ones.

**Goal 3 — Improve authorization rates.** Provide the systematic feedback loop — recurring root causes, configuration weaknesses, issuer-specific behavior — that lets teams raise their overall payment authorization rate over time.

**Goal 4 — Accelerate issue resolution.** Reduce the elapsed time from "a failure pattern emerges" to "a decision is made and an action is taken," so issues are addressed while they are still costing money rather than after the fact.

**Goal 5 — Make investigation consistent and auditable.** Codify expert investigation reasoning so outcomes are repeatable across analysts and teams, and so every decision carries a defensible evidence trail suitable for internal audit and leadership review.

**Goal 6 — Demonstrate responsible agentic AI in operations.** Show that a multi-agent, human-in-the-loop system can augment a specialist enterprise team without removing human accountability — a reference model for agentic AI in payment operations.

These goals are the lens for the Success Metrics in Section 21. Every metric must trace back to one of these goals.

---

## 7. Target Users

PayResolve AI is an **internal, role-based enterprise tool**. It is not customer-facing and is never used by cardholders or merchants' end customers. Its users are operational professionals inside payment processors, acquiring banks, payment gateways, or large merchant payment teams.

**Primary user — Payment Operations Analyst.** The day-to-day operator of the platform. Monitors payment health, investigates authorization-failure cases, reviews AI-generated investigations, and approves, overrides, or escalates recommendations. This user spends the most time in the product, and the core experience is designed primarily for them.

**Secondary user — Payment Operations Manager.** Oversees the team and the queue. Monitors operational KPIs, prioritizes the most critical investigation queues, reviews high-value or high-risk cases, and measures team productivity. Uses the product more for oversight, prioritization, and reporting than for hands-on investigation.

**Secondary user — Risk Analyst.** Engaged selectively on cases that carry fraud signals or issuer-related risk indicators. Reviews and validates AI findings on these cases and recommends risk-mitigation actions. Not a continuous daily user, but an essential reviewer for a defined subset of cases.

**Tertiary user — Merchant Support team.** Consumes the *outputs* of investigations — particularly executive summaries and recommended actions — to respond to merchant inquiries about payment performance. Generally a reader/consumer of findings rather than an investigator.

Users are assumed to be domain-literate (they understand decline codes, 3DS, issuers/acquirers, authorization flows) but are **not** assumed to be data scientists, engineers, or AI experts. The product must be usable by an operations professional, not only by a technical specialist.

---

## 8. User Personas

The following personas make the target users concrete. They are representative, not exhaustive.

### Persona A — "Priya," Payment Operations Analyst (Primary)
- **Role context:** Front-line investigator on a payment ops team at a mid-to-large acquiring bank. Works a daily queue of payment-health alerts and failure patterns.
- **Goals:** Quickly understand why a cluster of payments failed, decide what to do, and move on to the next case without drowning in logs.
- **Frustrations today:** Spends most of her day gathering and reconciling data by hand; struggles to tell an issuer outage apart from a configuration problem; can never confidently say how much revenue a pattern is costing.
- **What success looks like for her:** She opens a case, sees the AI team's classification, root cause, impact estimate, and recommended actions with supporting evidence, and can approve or adjust in minutes — while still being the one who makes the call.
- **Relationship to the AI:** Trusts but verifies. She needs to see the evidence behind every AI claim, and she needs an easy way to override.

### Persona B — "Marcus," Payment Operations Manager (Secondary)
- **Role context:** Leads a team of analysts; accountable to leadership for authorization rate and operational throughput.
- **Goals:** Keep the most damaging issues prioritized, ensure high-value cases get proper attention, and report team performance and recovered revenue upward.
- **Frustrations today:** No reliable view of which open issues matter most by business impact; productivity and recovery outcomes are hard to measure; executive reporting is manual.
- **What success looks like for him:** A prioritized, impact-ranked view of investigations, visibility into team productivity, and one-click access to executive-ready summaries.
- **Relationship to the AI:** Cares about quantified impact and consistency more than the mechanics of any single investigation.

### Persona C — "Lena," Risk Analyst (Secondary)
- **Role context:** Specialist who reviews cases flagged with fraud or issuer-risk indicators.
- **Goals:** Validate that the AI's findings hold up on risk-sensitive cases and recommend appropriate mitigations.
- **Frustrations today:** Pulled into investigations late and with incomplete context; has to reconstruct what was already analyzed.
- **What success looks like for her:** Risk-flagged cases arrive with the full AI evidence trail attached, so she can validate or challenge findings efficiently.
- **Relationship to the AI:** A reviewer and validator; she scrutinizes AI conclusions on the highest-stakes cases.

### Persona D — "Tom," Merchant Support Specialist (Tertiary)
- **Role context:** Fields merchant questions about payment performance and declines.
- **Goals:** Give merchants a clear, accurate, non-technical explanation of what happened and what is being done.
- **Frustrations today:** No accessible summary of operational findings; relies on chasing analysts for context.
- **What success looks like for him:** Reads the executive summary and recommendations and responds to merchants confidently.
- **Relationship to the AI:** Consumes outputs; does not investigate.

---

## 9. User Journey

The end-to-end journey describes the primary analyst path, with manager and risk-analyst branches noted. It is intentionally workflow-level, not screen-level. The canonical workflow is:

> **Dashboard → Category → Investigation Queue → Case Preview → Launch Investigation → Multi-Agent Workspace → Executive Report → Close Case**

**Stage 1 — Dashboard (monitor payment health, entry).** The user lands on a dashboard that surfaces the overall health of payment authorization activity and highlights where failures are concentrating. The purpose of this stage is orientation: *where should attention go right now?*

**Stage 2 — Category (select a failure category).** The user drills into a specific payment-failure **category** (Authentication Failure (3DS), Insufficient Funds, Expired Card, Do Not Honor, Issuer Unavailable). Categories are the organizing lens that groups failures into investigable themes.

**Stage 3 — Investigation Queue (review and triage).** Within a category, the user works the **Investigation Queue** — a first-class, prioritized list of **investigation cases** (clusters of related failed transactions). Prioritization reflects business impact and urgency so the most valuable work rises to the top. Managers use the queue to triage, assign, and oversee workload; analysts use it to pick their next case.

**Stage 4 — Case Preview.** The user selects a case from the queue and sees a **preview**: its scope and the grouped transactions, the failure context, current lifecycle status, priority, and any risk indicators — enough to decide whether and how to investigate, before committing.

**Stage 5 — Launch Investigation.** From the preview, the user explicitly **launches the investigation**, kicking off the multi-agent analysis for that case. This is a deliberate operator action, not an automatic one.

**Stage 6 — Multi-Agent Workspace (observe the agents collaborate).** The investigation runs in the **Multi-Agent Workspace**, where the coordinated team of specialized AI agents works the case in sequence — orchestration, classification, root-cause analysis, recovery recommendation, revenue-impact estimation, and executive summarization. The user observes the collaboration and inspects the evidence and reasoning each agent produces. Here the user reviews the findings — failure pattern, most likely root cause and its evidence, estimated business impact and recovery opportunity, and recommended recovery actions with trade-offs — and makes the decision: **approve, override, or escalate**. Approving or overriding records the operator decision; escalating routes the case (with full context) to another role, such as a Risk Analyst (Persona C) for validation.

**Stage 7 — Executive Report.** Once a decision is reached, the user generates the **Executive Report** for the case: an executive-ready summary of what happened, what it cost, what was decided, and what is recommended. This output also serves Merchant Support (Persona D) and management reporting.

**Stage 8 — Close Case.** The case is resolved and closed, with its full decision and evidence trail retained for audit, learning, and measurement. Closed cases feed the longer-term feedback loop that improves authorization rates (Section 6, Goal 3).

**Cross-cutting journey properties:** at every stage the analyst remains in control; evidence is always inspectable; investigations are launched and decisions made deliberately by a person; and the path from "a failure exists" to "a decision is made and recorded" is designed to be short.

---

## 10. Navigation Rules

The product enforces a strict navigation order that mirrors the workflow. Navigation is not free-form: a user cannot reach a screen whose required state (a selected category, a selected case, a launched investigation) does not yet exist. This rule is what guarantees the product never renders a screen against missing or stale state.

**Canonical navigation path:**

```
Dashboard
   ↓
Category
   ↓
Investigation Queue
   ↓
Case Preview
   ↓
Multi-Agent Workspace
   ↓
Executive Report
   ↓
Close Case
```

**Allowed transitions:**

```
Dashboard           → Category
Category            → Investigation Queue
Investigation Queue → Case Preview
Case Preview        → Multi-Agent Workspace   (only after Launch Investigation)
Multi-Agent Workspace → Executive Report      (only after a human decision)
Executive Report    → Close Case
```

Backward navigation is allowed (a user may step back toward the Dashboard at any time), and stepping back resets the dependent downstream state per the State Model (Section 15).

**Not allowed (must be blocked):**

```
Dashboard            → Multi-Agent Workspace   ❌  (no category, no case selected)
Category             → Multi-Agent Workspace   ❌  (no case selected)
Investigation Queue  → Multi-Agent Workspace   ❌  (case previewed but investigation not launched)
Case Preview         → Executive Report        ❌  (investigation not run / no decision)
Multi-Agent Workspace→ Executive Report        ❌  (before a human decision is recorded)
Any screen           → Executive Report        ❌  (without a current investigation)
```

**Rule statements:**
1. The Multi-Agent Workspace is unreachable without a selected case **and** an explicitly launched investigation.
2. The Executive Report is unreachable without a current investigation that has reached a human decision.
3. Navigating to a category with no case selected shows the queue with **no active investigation** (see Product Events, Section 16).
4. Deep-linking or any attempt to jump ahead of required state resolves to the furthest valid screen the current state supports, never to a screen rendered against missing state.

---

## 11. Product Scope

The following capabilities are **in scope** for the product PayResolve AI is intended to be. (This defines the product boundary; specific release sequencing belongs to planning, not the PRD.)

**Payment health monitoring.** A monitoring surface that conveys the state of payment authorization activity and highlights where authorization failures are concentrating, so users know where to focus.

**Failure categorization.** Organizing authorization failures into a defined set of payment-failure categories. The MVP supports five payment decline categories: Authentication Failure (3DS), Insufficient Funds, Expired Card, Do Not Honor, and Issuer Unavailable. The architecture must support adding further payment decline categories in future releases without requiring architectural redesign.

**Investigation case grouping.** Grouping related failed transactions into investigation cases that can be queued, prioritized, worked, and closed as units, each progressing through a defined lifecycle (New → Queued → Investigating → Awaiting Human Review → Approved → Closed).

**Investigation Queue (first-class component).** A first-class, prioritized queue of investigation cases per category that reflects business impact and urgency, supporting triage, assignment, and oversight by analysts and managers.

**Case Preview and explicit investigation launch.** A preview of a case's scope before committing, and a deliberate operator action to launch the multi-agent investigation (investigations are not started automatically).

**Multi-agent AI investigation.** A coordinated team of specialized AI agents that collaborate to investigate a case — orchestrating the workflow, classifying the failure pattern, determining root cause, recommending recovery actions, estimating revenue/business impact, and producing an executive summary.

**Transparent evidence and reasoning.** Surfacing the evidence each agent relies on and the reasoning behind each conclusion, so findings are inspectable rather than opaque.

**Human review and decisioning.** Workflow for the analyst to approve, override, or escalate AI recommendations, with the analyst as the final decision-maker on every case.

**Escalation paths.** The ability to escalate cases to other roles — notably risk-flagged cases to Risk Analysts — with full context attached.

**Executive Report (first-class output).** Generation of an executive-ready investigation summary and recommendations per case — what happened, what it cost, what was decided, what is recommended.

**Case lifecycle management.** Taking a case through its defined lifecycle, retaining an auditable trail at every transition.

**Operational KPIs and productivity visibility.** Views that let managers monitor operational KPIs, prioritize critical queues, review high-value cases, and measure team productivity.

**Role-based access.** Differentiated access and experience for the defined roles (Analyst, Manager, Risk Analyst, Merchant Support).

**Enterprise scale.** Designed to operate over thousands of payment events and hundreds of active investigation cases.

---

## 12. Out of Scope

The following are explicitly **out of scope** for this product, to prevent scope creep and set clear boundaries.

**Not a customer-facing product.** PayResolve AI is internal-only. Cardholders, the merchant's end customers, and external parties are never direct users.

**Not a payment processor or gateway.** The product does not authorize, capture, settle, route, or otherwise *execute* payments. It investigates and recommends; it does not move money or transact.

**Not an AML / financial crime platform.** Detecting money laundering, sanctions screening, and financial-crime casework are out of scope. The product may surface fraud-related *risk indicators* on a case for escalation to a Risk Analyst, but it is not an AML or financial-crime investigation system.

**Not personal finance, expense management, or generic case management.** The product is purpose-built for payment authorization operations.

**Not a fully autonomous AI system.** The AI does not make or execute final decisions on its own. A human reviews and is accountable for every case outcome.

**Not a fraud-scoring or transaction-blocking engine.** Real-time transaction approval/decline scoring and inline blocking of live payments are out of scope.

**Does not execute recovery actions.** Payment retries, merchant configuration changes, gateway/routing changes, and issuer escalations are recommended only; they are executed in external enterprise systems after analyst approval (see Section 14).

**No external data-vendor productization, billing, or licensing features.** Monetization, metering, and external commercialization are out of scope for this product definition.

**Note:** Specific technology choices, hosting model, and identity provider are deferred to later specification documents and are intentionally *not* decided here.

---

## 13. Core Concepts

These are the foundational domain concepts the entire product is built on, in the canonical order: **Category, Investigation Queue, Investigation Case, Transaction, Evidence, Investigation, AI Agent, Executive Report.** They are defined here at the conceptual level; their attributes and transitions will be detailed in the Functional Specification.

**1. Category.** A defined class of payment authorization failure that groups failures by their nature — the top-level organizing lens. The MVP set comprises five categories: Authentication Failure (3DS), Insufficient Funds, Expired Card, Do Not Honor, and Issuer Unavailable; the architecture is designed to admit additional categories in future releases without redesign. Investigation queues and cases live within categories.

**2. Investigation Queue.** A first-class, prioritized list of investigation cases within a category. It is the primary work surface between selecting a category and opening a case: it ranks cases by business impact and urgency, supports triage and assignment by managers, and lets analysts pick their next case.

**3. Investigation Case.** The central unit of work — a cohesive grouping of related failed transactions investigated, decided, and resolved together. A case has an owner/assignee, a priority, a retained evidence-and-decision trail, and a defined **lifecycle**:
- **New** — the case has been formed (transactions grouped) but not yet placed for work.
- **Queued** — the case is in the Investigation Queue, prioritized and awaiting pickup.
- **Investigating** — a human has launched the investigation; the multi-agent analysis is underway.
- **Awaiting Human Review** — the agents have produced findings and recommendations; the case awaits the analyst decision.
- **Approved** — a human has rendered the decision on the case.
- **Closed** — the case is resolved and archived with its full audited trail.

(Escalation is a branch from *Awaiting Human Review* that routes the case to another role for validation before it returns to the decision path.)

**4. Transaction.** An individual *failed* payment authorization event — the atomic raw fact. Transactions are grouped into Investigation Cases. The AI investigates **cases, not individual transactions**: a transaction is an evidence input analyzed *in aggregate* as part of a case, never as the standalone unit of work.

**5. Evidence.** The supporting facts, signals, and reasoning that justify every AI conclusion and every human decision. Each classification, root-cause determination, impact estimate, and recommendation is backed by inspectable evidence drawn from the transactions and the agents' analysis. Evidence is surfaced to users before they approve and retained with the closed case for audit.

**6. Investigation.** The analytical process applied to a case: the coordinated work of the AI agent team to classify, determine root cause, estimate impact, and recommend actions — culminating in a human decision. One case has exactly one investigation (Principle 1), and that investigation is the single source of truth (Principle 2). It produces findings, recommendations, and the Executive Report.

**7. AI Agent.** A specialized, role-bounded AI participant. PayResolve AI uses a *team* of cooperating agents working in sequence under an orchestrator:
- **Manager Agent** — orchestrates the investigation, delegates tasks, assembles the result, and validates consistency.
- **Classification Agent** — identifies the dominant payment-failure pattern.
- **Root Cause Agent** — determines the most likely underlying cause, grounded in evidence.
- **Recovery Agent** — recommends recovery actions and explains trade-offs. **Recommendations only.**
- **Revenue Impact Agent** — estimates business impact and recovery opportunity in revenue terms.
- **Executive Agent** — produces the Executive Report.

Agents collaborate **sequentially**, each contributing inspectable evidence and reasoning. Agents *do not* make final decisions or take real-world actions (see Section 17).

**8. Executive Report.** The executive-ready output of a completed investigation: what happened, what it cost, what the human decided, and what is recommended. Consumed by leadership and Merchant Support; part of the retained case record.

**Relationship summary:** A *Category* contains an *Investigation Queue* of many *Investigation Cases*. An *Investigation Case* owns its *Transactions*, *Evidence*, *Investigation*, and *Executive Report*, and moves through its lifecycle. Each case has exactly one *Investigation*, carried out by the *AI Agent* team. A *human* reviews and renders the final decision; recovery actions are recommended only and executed externally.

---

## 14. Product Constraints

These are hard constraints — statements of what **must always** and **must never** be true. They are binding on the Functional Specification and the implementation. Violating any of them is a defect. Where a constraint is specific to the MVP, it is marked as such; the underlying architecture must remain scalable beyond the MVP figures.

**Structural constraints (data shape):**
- **MVP scope of categories.** The MVP supports **five payment decline categories**: Authentication Failure (3DS), Insufficient Funds, Expired Card, Do Not Honor, Issuer Unavailable. The platform architecture must support adding additional payment decline categories in future releases without requiring architectural redesign or changes to the state model.
- **MVP scope of cases.** The MVP ships with **ten investigation cases per category** for demonstration purposes. The platform architecture must support an arbitrary number of investigation cases per category without changes to the product architecture or state model.
- Each investigation case is **unique** (no duplicate or shared cases).
- Each investigation case **owns its own**: merchant, transactions, evidence, investigation, and report.
- **Cases never share investigation objects.** Two cases never reference, point to, or reuse the same investigation.

**State constraints (runtime behavior):**
- The platform has **exactly one active investigation** at any time.
- **Only one Investigation Object exists in memory** at any time — the current investigation.
- **Changing cases destroys the previous investigation.** Selecting a new case discards the prior in-memory investigation and rebuilds a fresh one for the newly selected case.
- **Every screen reads from `currentInvestigation`.** No screen reads from, or keeps, any other copy of investigation state.

**Behavioral invariants (must never happen):**
- A case must **never** display another case's merchant, transactions, evidence, investigation, or report.
- The product must **never** hold two Investigation Objects simultaneously.
- The product must **never** finalize a case outcome without a human decision (Principle 3).
- The product must **never** execute a recovery action; recovery actions are recommendations only, executed in external enterprise systems after analyst approval.
- A screen must **never** render against a stale or absent `currentInvestigation`.

These constraints, taken together with the State Model (Section 15), are the primary defense against the class of stale-state and cross-contamination bugs the product must avoid.

---

## 15. Product State Model

The product has a single, strictly ordered state hierarchy. Downstream state derives from upstream state; when an upstream selection changes, all downstream state is rebuilt from it. There is one source of truth for an investigation — `currentInvestigation` — and the entire application reads from it.

**State derivation chain:**

```
selectedCategory
      ↓
Investigation Queue        (the cases within the selected category)
      ↓
selectedCase
      ↓
currentInvestigation       (the single Investigation Object, rebuilt for the selected case)
      ↓
Entire Application         (every screen renders from currentInvestigation)
```

**Rules of the state model:**
1. **Single source of truth.** `currentInvestigation` is the one authoritative investigation. Every screen — workspace, evidence view, report, timeline, agent conversation — reads from it. No screen maintains its own copy (Principle 6).
2. **Top-down derivation.** Selecting a category determines the queue. Selecting a case determines `currentInvestigation`. Nothing downstream is set independently of what is upstream.
3. **Rebuild on case change.** When `selectedCase` changes, the previous `currentInvestigation` is destroyed and a new one is built for the new case (Section 14). There is never a moment where two investigations coexist.
4. **Global refresh.** Any change to `currentInvestigation` refreshes the entire application view, not a single panel (Principle 7). The UI is a pure render of current state.
5. **No partial state.** If `selectedCategory` is set but `selectedCase` is not, there is **no** `currentInvestigation` — and screens that require one are unreachable (Section 10). State is either fully present for a screen or that screen is not shown.
6. **Reset on backward navigation.** Stepping back up the chain clears everything below it (e.g., returning to category selection clears `selectedCase` and destroys `currentInvestigation`).

This model is the structural reason the product is free of stale merchants, stale reports, stale timelines, and duplicate investigations.

---

## 16. Product Events

User actions are the only triggers of state change. Each meaningful action flows through a single, predictable pipeline:

```
User Action
      ↓
Application Event
      ↓
State Change
      ↓
UI Refresh
```

The UI never changes except as the result of an event-driven state change, and a state change always refreshes the whole application view (Principle 7, Section 15).

**Defined product events:**

**Event — User selects a category:**
```
User selects category
      ↓
selectedCategory set; downstream state cleared
      ↓
Investigation Queue loads (the cases for that category — ten per category in the MVP)
      ↓
No current investigation exists
      ↓
UI refreshes to the Queue with no active investigation
```

**Event — User selects (previews) a case:**
```
User selects case
      ↓
selectedCase set
      ↓
Case Preview shown (scope, transactions, status, priority, risk indicators)
      ↓
(No investigation is launched yet — preview only)
```

**Event — User launches the investigation:**
```
User launches investigation
      ↓
Previous currentInvestigation destroyed (if any)
      ↓
currentInvestigation rebuilt for the selected case
      ↓
Case lifecycle → Investigating; agents begin
      ↓
Entire UI refreshed against the new currentInvestigation
```

**Event — User makes a decision (approve / override / escalate):**
```
User decides
      ↓
Human decision recorded on currentInvestigation
      ↓
Case lifecycle → Approved (approve/override) or escalation branch (escalate)
      ↓
UI refreshes; Executive Report becomes reachable
```

**Event — User generates the Executive Report:**
```
User generates report
      ↓
Executive Report produced from currentInvestigation
      ↓
UI refreshes to show the report
```

**Event — User closes the case:**
```
User closes case
      ↓
Case lifecycle → Closed; full trail retained
      ↓
UI refreshes; case leaves the active queue
```

**Event — User changes to a different case (the critical event):**
```
User selects a different case
      ↓
Previous currentInvestigation destroyed
      ↓
currentInvestigation rebuilt for the new case
      ↓
Entire application refreshed — no stale merchant, report, timeline, or conversation remains
```

---

## 17. AI Behaviour Principles

These principles govern how the AI agents are allowed to behave. They are product requirements, not implementation suggestions, and they exist to keep the system trustworthy and human-supervised.

1. **Agents never fabricate evidence.** Every piece of evidence an agent presents must derive from the case's actual transactions and data. Agents do not invent facts, figures, logs, or signals.
2. **Agents cannot skip previous agent output.** Each agent must consume and build on the outputs of the agents before it in the sequence. The chain is not bypassed.
3. **Agents must cite evidence.** Every conclusion an agent reaches is tied to the specific evidence supporting it. Conclusions without cited evidence are not permitted (Principle 4).
4. **Agents must expose confidence.** Each agent communicates how confident it is in its findings, including where confidence is low or hypotheses compete.
5. **Agents never contradict previous findings.** An agent does not silently overturn or conflict with an upstream agent's validated output; disagreements surface explicitly rather than producing an inconsistent result.
6. **The Manager Agent validates consistency.** The Manager Agent is responsible for checking that the assembled investigation is internally consistent — evidence supports conclusions, agents do not contradict one another, and the result is coherent — before it is presented to the human.
7. **Agents recommend; they never decide or act.** Agents produce findings and recommendations only. They never render the final decision and never execute a recovery action (Principle 3, Section 14).

---

## 18. Error States

Enterprise software must define how the product behaves when things go wrong. Each error state below must be explicitly handled in the UX and the implementation — never left to fail silently or to render against missing state. The detailed copy and recovery flows belong to the Functional Specification; this section enumerates the states that must be designed for.

**Data-availability errors:**
- **No transactions.** A case has no failed transactions to investigate. The product must communicate this and prevent launching an empty investigation.
- **No evidence.** The investigation cannot assemble supporting evidence. Conclusions must not be presented (Principle 4); the user is told evidence is unavailable.
- **Missing gateway logs.** Required source signals (e.g., gateway/authorization logs) are absent. The affected analysis must be marked as incomplete rather than guessed.

**Investigation-quality errors:**
- **Low confidence.** The agents' confidence falls below an acceptable threshold. The product surfaces the low-confidence state clearly so the analyst can weight the findings accordingly or escalate.

**Process / runtime errors:**
- **Agent timeout.** An agent does not complete within its expected time. The investigation must report which agent stalled and offer retry/escalate paths rather than appearing to hang or silently completing.
- **Investigation failed.** The investigation could not be completed (orchestration failure, upstream dependency failure). The case must not advance to a decision or report; the failure is shown with a clear recovery path.

**Cross-cutting error rules:**
- No error state may leave the application rendering a stale or partial `currentInvestigation`.
- Every error state is attributable in the case's trail (what failed, when), preserving auditability.
- Error states never silently fall back to fabricated or cached results from another case.

---

## 19. High-Level Product Architecture

This is a *conceptual* architecture describing the major product layers and how they relate. It is deliberately technology-agnostic — no frameworks, services, data stores, or APIs are specified here.

**Layer 1 — Experience layer (role-based web UI).** The browser-based interface through which all four roles work, adapting by role. It presents payment health, category navigation, the Investigation Queue, Case Preview, the Multi-Agent Workspace, evidence review, the approve/override/escalate controls, the Executive Report, and case closure. Every screen is a pure render of `currentInvestigation` (Section 15).

**Layer 2 — Investigation workflow & case lifecycle.** The orchestration of work *as a human process*: case creation and grouping, queue prioritization, assignment, lifecycle transitions (New → Queued → Investigating → Awaiting Human Review → Approved → Closed), the decision points, escalation routing, and reporting/closure. This layer enforces the human review control points and the navigation rules (Section 10).

**Layer 3 — Multi-agent investigation system.** The coordinated AI agent team (Manager, Classification, Root Cause, Recovery, Revenue Impact, Executive) that performs the analytical investigation, producing findings, recommendations, and the evidence/reasoning that back them, under the AI behaviour principles (Section 17). It proposes; it never finalizes or executes.

**Layer 4 — Evidence & reasoning layer.** Captures, structures, and exposes the evidence behind every AI conclusion and human decision, and preserves it for transparency at decision time and audit after closure.

**Layer 5 — State & source-of-truth layer.** Holds the single `currentInvestigation` and the upstream selections it derives from, enforcing the state model (Section 15) and the single-investigation constraints (Section 14). This is the spine the experience layer renders from.

**Layer 6 — Payment data domain.** The conceptual home of the transactions, failure events, and payment context investigations reason over.

**Layer 7 — Reporting & insights.** Generation of Executive Reports per case, plus aggregate operational KPIs and productivity/recovery views, and the longer-term authorization-rate feedback.

**Layer 8 — Access & governance (cross-cutting).** Role-based access control and the auditability guarantees spanning all layers.

**Guiding architectural principles (product-level):** human oversight by design; evidence-first; a single source of truth with global refresh; separation of investigation (AI) from decision and action (human/external systems); and enterprise scale with role separation.

---

## 20. Non-Functional Requirements

These define the qualities the product must meet regardless of feature content. Targets are directional and will be confirmed during implementation planning.

**Performance**
- **Investigation generation:** an investigation should produce its findings in **under 2 seconds** under normal conditions.
- **UI refresh:** any state-driven UI refresh should complete in **under 500 ms**.
- **Navigation:** transitions between screens happen **without full page reloads** — navigation is in-application and immediate.

**Responsiveness & layout**
- **Desktop-first.** The product is optimized for desktop operational use. (Mobile is not a target environment for this product.)

**Accessibility**
- **WCAG AA.** The product must meet WCAG AA accessibility standards.

**Browser support**
- Supported browsers: **Chrome, Edge, Safari** (current versions).

**Scale**
- Must operate over **thousands of payment events** and **hundreds of active investigation cases** without degradation of the performance targets above.

**Reliability & consistency**
- The single-investigation and global-refresh guarantees (Sections 14–15) must hold under all navigation and error conditions; no stale or duplicate state is acceptable.

---

## 21. Success Metrics

Metrics are organized by the business goals in Section 6. Each is defined conceptually; concrete targets and measurement methods will be set during planning and instrumentation design.

**Headline product success metrics.** The following six are the primary measures of whether PayResolve AI is succeeding:

1. **Authorization Rate Improvement** — the trend in overall payment authorization rate for adopting teams, attributable to issues PayResolve AI helped investigate and resolve.
2. **Investigation Time** — analyst time spent investigating a case, expected to fall substantially versus the manual baseline.
3. **Revenue Recovered** — revenue actually recovered as a result of approved recovery recommendations (with recoverable revenue *identified* tracked alongside).
4. **Average Time to Resolution** — elapsed time from case creation to a closed, decided case.
5. **Human Override Rate** — the share of AI recommendations humans override rather than approve; a calibration signal monitored over time (both too high and too low warrant investigation).
6. **AI Adoption** — active usage of the platform and its AI investigations across the intended roles.

**Goal-aligned supporting metrics:**
- *Reduced effort (Goal 1):* share of investigation steps handled by AI vs. manually; analyst-reported ease.
- *Recovered revenue (Goal 2):* recovery realization rate; recovery opportunity captured vs. surfaced.
- *Authorization rate (Goal 3):* reduction in recurrence of addressed root causes.
- *Faster resolution (Goal 4):* time from pattern emergence to first action; queue throughput.
- *Consistency & auditability (Goal 5):* coverage of closed cases with a complete evidence trail; consistency of outcomes across analysts.
- *Adoption & responsible AI (Goal 6):* user trust/confidence; maintenance of the human oversight guarantee (no case closed without a human decision — a hard invariant).

**Guardrail / counter-metrics:** rate of decisions later reversed; escalation accuracy; AI conclusion accuracy where ground truth is later known.

---

## 22. Acceptance Principles

Beyond metrics, the product has a binary completeness bar. **The application is considered complete only when all of the following hold:**

- ✓ **Every queue row opens a unique investigation** — selecting any case yields that case's own investigation, never another's.
- ✓ **Every screen refreshes** — every state change refreshes the entire application view from `currentInvestigation`.
- ✓ **No stale merchant** — a case never shows a previous case's merchant.
- ✓ **No stale report** — the Executive Report always reflects the current case, never a prior one.
- ✓ **No stale timeline** — the investigation timeline always belongs to the current case.
- ✓ **No stale conversation** — the agent conversation/workspace always belongs to the current case.
- ✓ **No hardcoded merchant** — merchants are owned by their case, never hardcoded into a screen.
- ✓ **No duplicate Investigation Objects** — only one Investigation Object exists in memory at any time.

These acceptance principles are the concrete, testable expression of the Product Principles (Section 2) and Product Constraints (Section 14), and they define "done" for the implementation.

---

## 23. Risks and Assumptions

### Assumptions
1. **Payment data is available and adequate** — failed-authorization data and context (decline reasons, 3DS results, issuer signals) are accessible at sufficient quality and timeliness.
2. **Failures are meaningfully groupable** into coherent investigation cases.
3. **The five MVP categories are sufficient for the initial release**, and the architecture admits additional categories later without redesign.
4. **Users are domain-literate but not technical specialists**, and will trust the tool if evidence is transparent.
5. **Recovery actions are executed elsewhere** — the org has existing systems/processes to carry out recommended actions.
6. **Human review and oversight is acceptable and desired**, and the org will staff the analyst/manager/risk roles.
7. **AI reasoning can be made sufficiently reliable and explainable** to earn analyst trust, with inspectable evidence.
8. **Enterprise scale targets are representative** (thousands of events, hundreds of active cases).

### Risks
1. **AI accuracy / hallucination risk.** *High.* Mitigation: evidence-first design, human review on every case, AI behaviour principles (Section 17), accuracy/override tracking.
2. **Over-trust / automation complacency.** *High.* Mitigation: make evidence review intrinsic to the decision; monitor approval/override calibration.
3. **Under-trust / low adoption.** *High.* Mitigation: transparency, explainability, demonstrated wins, change management.
4. **Data quality and availability gaps.** *High.* Mitigation: validate data assumptions early; surface low-confidence and missing-data error states (Section 18).
5. **Misattributed root causes leading to wrong actions.** *High.* Mitigation: analyst approval before action; show confidence and competing hypotheses; escalation paths.
6. **Inaccurate revenue-impact estimates.** *Medium-high.* Mitigation: transparent estimation assumptions; treat as estimates.
7. **Multi-agent coordination complexity / error propagation.** *Medium.* Mitigation: clear agent responsibilities, visible reasoning, Manager-Agent consistency validation, defined error states.
8. **Stale-state / cross-contamination defects.** *High.* Mitigation: single-source-of-truth state model (Section 15), single-investigation constraints (Section 14), and acceptance principles (Section 22).
9. **Scope creep toward fraud/AML or autonomy.** *Medium.* Mitigation: explicit Out-of-Scope boundaries (Section 12).
10. **Role/access and auditability gaps.** *Medium-high.* Mitigation: role-based access and audit as cross-cutting architectural requirements.
11. **Change-management and workflow-fit risk.** *Medium.* Mitigation: journey grounded in the real analyst workflow; involve users early.

### Open questions to resolve before/within the Functional Specification
- The exact transition rules between lifecycle states, including how escalation branches and rejoins the decision path.
- The rules and signals that determine case **prioritization** in the Investigation Queue (how business impact and urgency combine).
- How transactions are **grouped** into cases (the grouping logic) at the functional level.
- What constitutes a fraud/issuer **risk indicator** that triggers escalation to a Risk Analyst.
- The required contents and format of the **Executive Report**.
- Confidence representation: how the AI communicates certainty and competing hypotheses to the human.
- The exact thresholds behind the **low-confidence** and **agent-timeout** error states.

---

*End of Product Requirements Document (Version 1.2). This document defines the product only. Per the agreed process, the next document — the Functional Specification — will not begin until this PRD is reviewed and approved.*
