# PayResolve AI — Functional Specification
# FS-01 — Application Architecture

**Document type:** Functional Specification (implementation contract)
**Spec ID:** FS-01
**Title:** Application Architecture
**Status:** Draft for review
**Audience:** Software Engineers, UI Developers, QA Engineers, Solution Architects
**Depends on:** PRD v1.2 (approved)
**Version:** 1.2
**Last updated:** 30 June 2026
**Revision note (1.1):** Added three sections — Data Ownership Model (§6), Investigation Destruction Rules (§8), and AI Agent Dependency Model (§10) — and renumbered the existing sections after each insertion point (former §6→§7, §7→§9, §8→§11, §9→§12, §10→§13). All internal cross-references updated. No existing requirements were removed, reorganized, or simplified.
**Revision note (1.2):** Added the Investigation Consistency Principle as §10.6, invariant INV-15, and acceptance criterion AC-01-113. No section renumbering; no existing requirements changed.

> **Reading note.** This is an engineering contract, not a product narrative. It defines *how the application behaves* at the architectural level: screens, components, navigation, global state, transitions, lifecycle, refresh, invariants, and acceptance criteria. It contains no implementation technology, no code, and no styling. Where this document uses a name such as `currentInvestigation`, that name is a **logical contract identifier** — it names a behavior and an ownership rule, not a variable in any particular language or framework. Every requirement in this document is normative. The keywords **MUST**, **MUST NOT**, **SHALL**, and **MAY** carry their usual normative meaning.

---

## Conventions used in this document

- **Screen** — a top-level destination the user navigates to. Exactly one screen is active at a time.
- **Component** — a reusable UI unit rendered within a screen. Components do not own navigation.
- **Global state object** — a named, application-scoped piece of state with a single defined owner.
- **Derived state** — state computed from a global state object; never authored independently.
- **Stage** — a node in the canonical workflow (Dashboard … Close Case).
- Identifier styles: screens are written `Title Case`; global state objects and contract identifiers are written `camelCase` in code font; acceptance criteria are written `AC-01-NNN`.

---

## 1. Purpose

### 1.1 Purpose of this specification
FS-01 defines the **structural and behavioral skeleton** on which all other functional specifications (FS-02 onward) are built. It fixes the screen set, the component tree, the navigation graph, the global state model, the state-transition rules, the investigation lifecycle, the refresh contract, the system invariants, and the architectural acceptance criteria. Any later spec that defines a feature MUST conform to the architecture defined here.

### 1.2 What the application architecture is responsible for
The application architecture is responsible for guaranteeing four properties at all times:

1. **Single source of truth.** There is exactly one authoritative investigation in the application at any moment, and every screen and component renders from it. (PRD Principle 2, Constraint set §14.)
2. **Deterministic navigation.** A user can only reach a screen whose prerequisite state exists. The navigation graph is closed and enforced; there are no reachable states that render against missing or partial data.
3. **Coherent, global refresh.** A meaningful user action produces a single state change that refreshes the entire dependent view, never a partial or per-panel update that can leave stale data behind. (PRD Principle 7.)
4. **No cross-case contamination.** Data belonging to one case can never appear while another case is active. Switching cases destroys the prior investigation before the new one is presented.

### 1.3 Non-goals of this specification
FS-01 does **not** define: visual design, layout, styling, copy, specific agent prompts, data schemas, transport, persistence technology, or any feature-level behavior (those belong to FS-02+). It does **not** define authentication/identity mechanics beyond the existence of roles. It defines *architecture and behavior only*.

### 1.4 Audience-specific intent
- **Software / UI Engineers** — treat §3, §5, §6, §7, and §11 as the build contract for component composition, state ownership, data ownership, and refresh.
- **QA Engineers** — treat §4, §7, §8, §12, and §13 as the test basis; §13 acceptance criteria are directly testable.
- **Solution Architects** — treat §1, §5, §6, §9, §10, and §12 as the conformance boundary for any integration or extension.

---

## 2. Screen Hierarchy

### 2.1 Canonical screen flow
The application exposes seven screen-level stages in a single linear workflow. Exactly one screen is active at any time.

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

### 2.2 Screen catalogue
Each screen below lists its responsibility, the global state it requires to be present, what it produces, and the screens it can transition to. "Requires" means the screen MUST NOT render unless that state is present (see §4).

**S1 — Dashboard**
- **Responsibility:** Entry point. Presents aggregate payment-health and where authorization failures are concentrating. Orientation only; no investigation context.
- **Requires:** Nothing. Always reachable.
- **Produces:** A user intent to drill into a category.
- **May transition to:** Category.

**S2 — Category**
- **Responsibility:** Presents the set of payment-decline categories (five in the MVP, extensible per PRD §14) and lets the user choose one.
- **Requires:** Nothing beyond Dashboard having been the entry. Always reachable.
- **Produces:** Sets `selectedCategory`.
- **May transition to:** Investigation Queue (forward), Dashboard (back).

**S3 — Investigation Queue**
- **Responsibility:** Presents the prioritized list of investigation cases within `selectedCategory`. Primary triage/selection surface.
- **Requires:** `selectedCategory` is present.
- **Produces:** Sets `selectedCase` (on selection → preview).
- **May transition to:** Case Preview (forward), Category (back).

**S4 — Case Preview**
- **Responsibility:** Presents the scope of `selectedCase` (grouped transactions summary, failure context, lifecycle status, priority, risk indicators) **before** any investigation is launched. Read-only preview.
- **Requires:** `selectedCase` is present. `currentInvestigation` is **absent** at entry (preview precedes launch).
- **Produces:** A user action to **Launch Investigation**.
- **May transition to:** Multi-Agent Workspace (forward, only via Launch Investigation), Investigation Queue (back).

**S5 — Multi-Agent Workspace**
- **Responsibility:** The working screen. Hosts the live multi-agent investigation, the accumulating evidence, the agent reasoning/timeline, the findings and recommendations, and the human decision controls (approve / override / escalate).
- **Requires:** `selectedCase` present **and** `currentInvestigation` present (i.e., an investigation has been launched).
- **Produces:** Records a human decision on `currentInvestigation`; on escalate, routes the case.
- **May transition to:** Executive Report (forward, only after a decision is recorded), Investigation Queue / Case Preview (back — see §4 for the state-reset consequence).

**S6 — Executive Report**
- **Responsibility:** Presents the executive-ready report generated from `currentInvestigation` (what happened, impact/cost, decision, recommendation).
- **Requires:** `currentInvestigation` present **and** a recorded human decision on it.
- **Produces:** A generated report artifact bound to the case; a user action to close the case.
- **May transition to:** Close Case (forward), Multi-Agent Workspace (back).

**S7 — Close Case**
- **Responsibility:** Finalizes the case: transitions the case to **Closed**, retains the full evidence/decision trail, and removes the case from the active queue.
- **Requires:** `currentInvestigation` present with a recorded decision and a generated Executive Report.
- **Produces:** Case lifecycle → Closed; clears the active investigation context on exit.
- **May transition to:** Investigation Queue or Dashboard (forward/return).

### 2.3 Screen relationship rules
1. Screens form a **strict linear forward chain**; each forward step has exactly one successor.
2. Backward movement is permitted but is **state-reducing**: moving back to a screen invalidates all state downstream of that screen (§4.4, §7).
3. A screen is **never** rendered if its "Requires" precondition is unmet; the application resolves to the furthest valid screen instead (§4.5).
4. No two screens are active simultaneously.

---

## 3. Component Hierarchy

This section defines the major UI components, their composition tree, and the contract each exposes. **Inputs** are data a component reads (always derived from global state — never independently fetched or cached by the component). **Outputs** are events a component emits upward. **Dependencies** are the global state objects or sibling contracts the component relies on.

> **Composition rule (normative):** No component owns investigation state. Every component is a pure function of the global state it is given (PRD Principle 6). A component MUST NOT hold a private copy of `currentInvestigation`, `selectedCase`, or `selectedCategory`, and MUST NOT read case data except through the inputs passed to it.

### 3.1 Component tree (overview)
```
AppShell
├── NavigationController            (owns active-screen resolution)
├── GlobalStateProvider             (owns global state objects)
└── ScreenOutlet                    (renders exactly one screen)
    ├── DashboardScreen
    │   └── PaymentHealthPanel
    │       └── CategoryHealthTile (repeated)
    ├── CategoryScreen
    │   └── CategoryList
    │       └── CategoryCard (repeated)
    ├── InvestigationQueueScreen
    │   ├── QueueHeader
    │   └── QueueList
    │       └── QueueRow (repeated)
    ├── CasePreviewScreen
    │   ├── CaseSummaryPanel
    │   ├── TransactionGroupSummary
    │   ├── RiskIndicatorPanel
    │   └── LaunchInvestigationControl
    ├── MultiAgentWorkspaceScreen
    │   ├── AgentTimeline           (agent collaboration / conversation)
    │   ├── EvidencePanel
    │   ├── FindingsPanel           (classification, root cause, impact, recovery)
    │   ├── ConfidenceIndicator
    │   └── DecisionControl         (approve / override / escalate)
    ├── ExecutiveReportScreen
    │   ├── ReportView
    │   └── GenerateReportControl
    └── CloseCaseScreen
        └── CloseCaseControl
```

### 3.2 Structural components

**AppShell**
- **Purpose:** Root container. Composes the navigation controller, the global state provider, and the screen outlet. Owns nothing case-specific.
- **Parent:** none (root).
- **Children:** NavigationController, GlobalStateProvider, ScreenOutlet.
- **Inputs:** none.
- **Outputs:** none.
- **Dependencies:** none.

**GlobalStateProvider**
- **Purpose:** The single authority that holds and mutates the global state objects (`selectedCategory`, `selectedCase`, `currentInvestigation`) per §5. All reads and all mutations of global state pass through it.
- **Parent:** AppShell.
- **Children:** none (provides state to the tree).
- **Inputs:** state-change requests (events) from screens/components.
- **Outputs:** the current global state to consumers; change notifications that trigger refresh (§11).
- **Dependencies:** none upstream; it is the owner.

**NavigationController**
- **Purpose:** Resolves which screen is active based on global state and user navigation intents, and enforces the navigation graph (§4). It is the only component permitted to change the active screen.
- **Parent:** AppShell.
- **Children:** none.
- **Inputs:** navigation intents (forward/back/select); current global state.
- **Outputs:** the resolved active screen identity.
- **Dependencies:** GlobalStateProvider (reads state to validate transitions).

**ScreenOutlet**
- **Purpose:** Renders exactly the one screen the NavigationController has resolved as active.
- **Parent:** AppShell.
- **Children:** exactly one screen component at a time.
- **Inputs:** active screen identity; global state.
- **Outputs:** none.
- **Dependencies:** NavigationController, GlobalStateProvider.

### 3.3 Screen-level and content components

**DashboardScreen**
- **Purpose:** Render payment-health overview; offer entry into categories.
- **Parent:** ScreenOutlet. **Children:** PaymentHealthPanel.
- **Inputs:** aggregate health data (category-level, not case-level).
- **Outputs:** `intent:openCategory`.
- **Dependencies:** none case-specific (MUST NOT read `currentInvestigation`).

**PaymentHealthPanel / CategoryHealthTile**
- **Purpose:** Display where failures concentrate, per category.
- **Parent:** DashboardScreen (panel) / PaymentHealthPanel (tile).
- **Children:** CategoryHealthTile (repeated) / none.
- **Inputs:** per-category health summary.
- **Outputs:** `intent:openCategory(categoryId)` (tile).
- **Dependencies:** none case-specific.

**CategoryScreen / CategoryList / CategoryCard**
- **Purpose:** Present selectable categories and capture the selection.
- **Parent:** ScreenOutlet / CategoryScreen / CategoryList.
- **Children:** CategoryList / CategoryCard (repeated) / none.
- **Inputs:** the category set (MVP: five; extensible).
- **Outputs:** `intent:selectCategory(categoryId)`.
- **Dependencies:** writes `selectedCategory` via GlobalStateProvider (on selection).

**InvestigationQueueScreen / QueueHeader / QueueList / QueueRow**
- **Purpose:** Present the prioritized cases for `selectedCategory`; capture case selection.
- **Parent:** ScreenOutlet / InvestigationQueueScreen / InvestigationQueueScreen / QueueList.
- **Children:** QueueHeader + QueueList / none / QueueRow (repeated) / none.
- **Inputs:** the case list derived from `selectedCategory` (each row: case identity, priority, lifecycle status, impact summary, risk flag).
- **Outputs:** `intent:selectCase(caseId)` (QueueRow).
- **Dependencies:** `selectedCategory` (read). On selection, writes `selectedCase`.
- **Invariant:** Every `QueueRow` MUST map to a unique case; selecting a row MUST open that case's own data, never another's (AC-01-031).

**CasePreviewScreen + children**
- **CaseSummaryPanel** — case scope, lifecycle status, priority. Inputs: `selectedCase`. Outputs: none.
- **TransactionGroupSummary** — aggregate view of the case's grouped failed transactions. Inputs: `selectedCase`. Outputs: none.
- **RiskIndicatorPanel** — any fraud/issuer risk indicators on the case. Inputs: `selectedCase`. Outputs: none.
- **LaunchInvestigationControl** — the deliberate launch action. Inputs: `selectedCase`. Outputs: `intent:launchInvestigation`.
- **Parent:** ScreenOutlet (screen) / CasePreviewScreen (children).
- **Dependencies:** `selectedCase` (read). `currentInvestigation` MUST be absent here. Launch writes `currentInvestigation` (§7).

**MultiAgentWorkspaceScreen + children**
- **AgentTimeline** — the sequential agent collaboration / reasoning record for the current investigation. Inputs: `currentInvestigation`. Outputs: none.
- **EvidencePanel** — the accumulating, inspectable evidence. Inputs: `currentInvestigation`. Outputs: `intent:inspectEvidence(evidenceRef)` (read-only expansion).
- **FindingsPanel** — classification, root cause, revenue impact, recovery recommendations with trade-offs. Inputs: `currentInvestigation`. Outputs: none.
- **ConfidenceIndicator** — exposes agent/finding confidence; surfaces low-confidence state. Inputs: `currentInvestigation`. Outputs: none.
- **DecisionControl** — approve / override / escalate. Inputs: `currentInvestigation` (decision-eligibility derived from lifecycle). Outputs: `intent:decision(approve|override|escalate, payload)`.
- **Parent:** ScreenOutlet (screen) / MultiAgentWorkspaceScreen (children).
- **Dependencies:** `currentInvestigation` (read). DecisionControl writes the decision onto `currentInvestigation` (§7).
- **Invariant:** All five children read from the **same** `currentInvestigation`; none may render data from any other case (AC-01-032).

**ExecutiveReportScreen + children**
- **GenerateReportControl** — triggers report generation from `currentInvestigation`. Inputs: `currentInvestigation` (must have a decision). Outputs: `intent:generateReport`.
- **ReportView** — renders the generated report. Inputs: `currentInvestigation` (report payload). Outputs: `intent:closeCase`.
- **Parent:** ScreenOutlet / ExecutiveReportScreen.
- **Dependencies:** `currentInvestigation` (read; decision present).

**CloseCaseScreen / CloseCaseControl**
- **Purpose:** Finalize and close the case.
- **Parent:** ScreenOutlet / CloseCaseScreen.
- **Inputs:** `currentInvestigation` (decision + report present).
- **Outputs:** `intent:confirmClose`.
- **Dependencies:** `currentInvestigation` (read). On close: case → Closed; investigation context cleared on exit (§7).

### 3.4 Component contract rules (normative)
1. A content component reads **only** the inputs passed to it; it MUST NOT independently retrieve or cache case data.
2. A component emits intents upward; it MUST NOT mutate global state directly. Only GlobalStateProvider mutates global state.
3. A component MUST NOT change the active screen; only NavigationController does.
4. Repeated components (`QueueRow`, `CategoryCard`, `CategoryHealthTile`) MUST be keyed by their domain identity so no two instances can resolve to the same underlying entity.

---

## 4. Navigation Rules

### 4.1 Navigation graph (valid forward transitions)
| From | To | Guard (precondition that MUST hold) |
|---|---|---|
| Dashboard | Category | none |
| Category | Investigation Queue | `selectedCategory` present |
| Investigation Queue | Case Preview | `selectedCase` present |
| Case Preview | Multi-Agent Workspace | `currentInvestigation` present (Launch Investigation performed) |
| Multi-Agent Workspace | Executive Report | `currentInvestigation` present **and** decision recorded |
| Executive Report | Close Case | report generated for `currentInvestigation` |
| Close Case | Investigation Queue / Dashboard | case lifecycle = Closed |

### 4.2 Valid backward transitions (state-reducing)
| From | To | State effect on arrival |
|---|---|---|
| Category | Dashboard | clears `selectedCategory` |
| Investigation Queue | Category | clears `selectedCase` (no investigation existed) |
| Case Preview | Investigation Queue | clears `selectedCase` |
| Multi-Agent Workspace | Case Preview / Investigation Queue | **destroys `currentInvestigation`** (§7.7, §8) |
| Executive Report | Multi-Agent Workspace | retains `currentInvestigation` and its decision |
| Close Case | Executive Report | retains report |

### 4.3 Invalid navigation paths (MUST be blocked)
The following are explicitly prohibited. An attempt (via deep link, stale link, back/forward, or programmatic intent) MUST be denied and resolved per §4.5.

| Attempted path | Reason it is invalid |
|---|---|
| Dashboard → Multi-Agent Workspace | no `selectedCategory`, no `selectedCase`, no investigation |
| Category → Multi-Agent Workspace | no `selectedCase`, no investigation |
| Investigation Queue → Multi-Agent Workspace | case previewed but investigation **not launched** |
| Case Preview → Executive Report | no investigation run, no decision |
| Multi-Agent Workspace → Executive Report (before decision) | decision not recorded |
| Any screen → Executive Report (no `currentInvestigation`) | no investigation to report on |
| Any screen → Close Case (no decision or no report) | case not eligible to close |
| Skipping any forward stage | violates the linear chain guard |

### 4.4 State-reduction on backward navigation (normative)
Moving backward to any screen MUST invalidate every global state object that is downstream of that screen, in downstream-first order:
- Back to **Category** → clear `selectedCase` (if any) → clear `selectedCategory`-derived queue → destroy `currentInvestigation` (if any).
- Back to **Investigation Queue** → destroy `currentInvestigation` (if any) → clear `selectedCase`.
- Back to **Case Preview** → destroy `currentInvestigation` (if any); `selectedCase` retained.

No downstream state may survive a backward navigation past the screen that produced it.

### 4.5 Resolution rule for invalid/ambiguous entry
On any attempt to enter a screen whose guard is unmet, the NavigationController MUST resolve to the **furthest forward screen whose guards are all satisfied by current state**, never render the requested screen against missing state, and never fabricate the missing state. Example: a request for Multi-Agent Workspace with `selectedCategory` set but no `selectedCase` resolves to Investigation Queue.

### 4.6 Single-active-screen rule
Exactly one screen is active at all times. Navigation replaces the active screen atomically; there is no intermediate state with two screens or zero screens.

---

## 5. Global State

### 5.1 Global state objects
The application defines exactly three global state objects. They form a strict dependency chain: each is derived from / dependent on the one above it.

```
selectedCategory      (level 1)
      ↓ determines
Investigation Queue    (derived list; not a stored object)
      ↓ selection sets
selectedCase          (level 2)
      ↓ launch builds
currentInvestigation  (level 3 — the single source of truth)
      ↓ rendered by
Entire Application
```

**`selectedCategory`**
- **Definition:** The category the user is currently working within.
- **Owner:** GlobalStateProvider.
- **Set by:** `intent:selectCategory` (from CategoryScreen).
- **Cleared by:** backward navigation to/through Dashboard; reset when a different category is selected.
- **Lifecycle:** Exists from category selection until it is changed or cleared. Changing it MUST clear `selectedCase` and destroy `currentInvestigation` first (§7.7).
- **Derived from it:** the Investigation Queue (the case list for that category). The queue is **derived state**, not a stored global object.

**`selectedCase`**
- **Definition:** The single case the user has chosen to preview/work.
- **Owner:** GlobalStateProvider.
- **Set by:** `intent:selectCase` (from QueueRow).
- **Cleared by:** backward navigation to Investigation Queue or Category; reset when a different case is selected.
- **Lifecycle:** Exists from case selection. Selecting it does **not** create an investigation (preview precedes launch). Changing `selectedCase` MUST destroy any existing `currentInvestigation` first (§7.7).
- **Precondition:** MUST NOT be set unless `selectedCategory` is present.

**`currentInvestigation`**
- **Definition:** The one and only active investigation object — the single source of truth that every workspace/report/close screen renders from.
- **Owner:** GlobalStateProvider.
- **Set by:** `intent:launchInvestigation` (from LaunchInvestigationControl), which **builds** it for `selectedCase`.
- **Mutated by:** the investigation process (agent outputs, evidence accumulation) and the human decision (`intent:decision`) and report generation — all applied in place to the same single object.
- **Destroyed by:** any change of `selectedCase`/`selectedCategory`, backward navigation out of the workspace, and case closure exit (the complete destruction contract is in §8).
- **Lifecycle:** Built on launch → populated during investigation → carries the decision → carries the report → destroyed on close-exit or case change.
- **Cardinality invariant:** At most **one** `currentInvestigation` exists at any time. Never two. (§12.)

### 5.2 Ownership rules (normative)
1. GlobalStateProvider is the **sole owner and sole mutator** of all three objects. No screen or component mutates them directly.
2. Every consumer reads global state through the provider; no consumer keeps a private copy (PRD Principle 6).
3. The three objects MUST always be in a **consistent level relationship**: it is illegal to have `selectedCase` without `selectedCategory`, or `currentInvestigation` without `selectedCase`.
4. Derived state (the queue, decision-eligibility, report-eligibility) is computed from the owned objects and is never authored independently.

### 5.3 Legal state combinations
| `selectedCategory` | `selectedCase` | `currentInvestigation` | Legal? | Furthest valid screen |
|---|---|---|---|---|
| absent | absent | absent | ✅ | Dashboard / Category |
| present | absent | absent | ✅ | Investigation Queue |
| present | present | absent | ✅ | Case Preview |
| present | present | present | ✅ | Multi-Agent Workspace → Executive Report → Close Case (by decision/report progress) |
| absent | present | * | ❌ illegal | resolve down: clear `selectedCase` |
| * | absent | present | ❌ illegal | resolve down: destroy `currentInvestigation` |
| present | present | present (×2) | ❌ illegal | architecture defect (§12, AC-01-090) |

Any row marked illegal MUST be impossible to construct; the state-transition rules (§7) and invariants (§12) exist to prevent them.

---

## 6. Data Ownership Model

### 6.1 Purpose
Where §5 (Global State) governs the **transient runtime selection chain** the user moves through, this section governs the **business-object ownership hierarchy**: which domain object owns which, and the absolute prohibition on sharing business objects between cases. This model is the structural complement to PRD §13–14 (Core Concepts and Product Constraints) and is the data-side guarantee behind invariant INV-6 (no cross-case contamination).

### 6.2 Ownership hierarchy
```
Category
    │
    ├── Investigation Case
    │        │
    │        ├── Transactions
    │        ├── Evidence
    │        ├── Investigation
    │        └── Executive Report
```

A **Category** contains many **Investigation Cases**. Each **Investigation Case** is the sole owner of its **Transactions**, its **Evidence**, its **Investigation**, and its **Executive Report**. Ownership flows strictly downward; no business object is owned by more than one parent, and no business object is shared sideways between siblings.

### 6.3 Ownership rules (normative)
1. **Categories own Investigation Cases.** Every case belongs to exactly one category; a case is never owned by, or listed under, two categories.
2. **Investigation Cases own their Transactions.** The grouped failed transactions of a case belong to that case alone.
3. **Investigation Cases own their Evidence.** The evidence collection produced during a case's investigation belongs to that case alone.
4. **Investigation Cases own their Investigation.** The single Investigation object for a case belongs to that case alone (one case = one investigation; PRD Principle 1).
5. **Investigation Cases own their Executive Report.** The report generated for a case belongs to that case alone.
6. **Business objects are never shared between cases.** No Transaction set, Evidence collection, Investigation, or Executive Report is ever referenced by, copied into, or reused across two cases.
7. **Two cases MUST NEVER reference the same Investigation object.** Each case's Investigation is unique to it; there is no shared or pooled Investigation.
8. **Two cases MUST NEVER reference the same Evidence collection.** Each case's Evidence is unique to it.
9. **Two cases MUST NEVER reference the same Executive Report.** Each case's report is unique to it.

These rules apply regardless of how similar two cases are; structural identity is never collapsed for similar content.

### 6.4 The Investigation Queue is not a persistent business object
The **Investigation Queue is not an owned business object.** It is a **derived view** computed on demand from the Investigation Cases that belong to `selectedCategory`, ordered by priority. Consequences (normative):
- The queue holds no data of its own; it owns nothing and persists nothing.
- The queue MUST always reflect the current set of cases for the selected category; it is recomputed whenever `selectedCategory` changes (§7.1).
- Nothing downstream (a case, an investigation, a report) may be derived *from* the queue; the queue is derived *from* the cases, never the reverse.
- Because the queue is derived, it can never be a source of stale or shared business state.

### 6.5 Conformance
This model is verified by the existing acceptance criteria for case uniqueness and non-contamination: AC-01-031 (each queue row resolves to a distinct case), AC-01-032 (all workspace components read one case), AC-01-080 (no residual prior-case business objects after a case switch), and AC-01-081 (a single Investigation object at any time). It directly supports invariants INV-2, INV-4, and INV-6.

---

## 7. State Transition Rules

This section defines the exact effect on global state of every user action. Each rule lists the **trigger**, the **precondition** (which MUST hold or the action is rejected), the **ordered state effect**, the **lifecycle effect** on the case, the **resulting screen**, and the **refresh scope** (detailed in §11).

> **Atomicity (normative):** Each transition is atomic. Either all listed state effects apply and a single refresh occurs, or none apply. There is no partially applied transition and no intermediate render.

### 7.1 T1 — Select Category
- **Trigger:** `intent:selectCategory(categoryId)`.
- **Precondition:** none.
- **State effect (ordered):** (1) if a different category was set: destroy `currentInvestigation` (if any) → clear `selectedCase`; (2) set `selectedCategory = categoryId`; (3) recompute derived queue.
- **Lifecycle effect:** none on any case.
- **Resulting screen:** Investigation Queue.
- **Refresh scope:** global (queue rebuilt; workspace/report context cleared).

### 7.2 T2 — Select (Preview) Case
- **Trigger:** `intent:selectCase(caseId)`.
- **Precondition:** `selectedCategory` present; `caseId` belongs to `selectedCategory`.
- **State effect (ordered):** (1) if a different case was set: **destroy `currentInvestigation`** (if any); (2) set `selectedCase = caseId`; (3) `currentInvestigation` remains **absent** (preview precedes launch).
- **Lifecycle effect:** none (preview is read-only).
- **Resulting screen:** Case Preview.
- **Refresh scope:** global (preview re-rendered for the new case; any prior workspace/report data is gone).

### 7.3 T3 — Launch Investigation
- **Trigger:** `intent:launchInvestigation`.
- **Precondition:** `selectedCase` present; `currentInvestigation` absent.
- **State effect (ordered):** (1) **build** a new `currentInvestigation` bound to `selectedCase`; (2) this is the only investigation object in memory.
- **Lifecycle effect:** case → **Investigating**; agent sequence begins.
- **Resulting screen:** Multi-Agent Workspace.
- **Refresh scope:** global (workspace renders the newly built investigation).

### 7.4 T4 — Investigation Progress (system-driven, within current investigation)
- **Trigger:** agent step completion / evidence accumulation (not a navigation action).
- **Precondition:** `currentInvestigation` present and in **Investigating**.
- **State effect:** mutate the **same** `currentInvestigation` in place (append agent output, evidence, findings, confidence). No new object is created.
- **Lifecycle effect:** remains **Investigating** until all agents complete, then → **Awaiting Human Review**.
- **Resulting screen:** Multi-Agent Workspace (unchanged).
- **Refresh scope:** the workspace child components bound to investigation content (§11.4).

### 7.5 T5 — Human Decision (Approve / Override / Escalate)
- **Trigger:** `intent:decision(type, payload)`.
- **Precondition:** `currentInvestigation` present and in **Awaiting Human Review**.
- **State effect:** record the decision (type + payload + actor + timestamp) onto the same `currentInvestigation`.
- **Lifecycle effect:**
  - *approve* or *override* → case → **Approved**.
  - *escalate* → case enters the **escalation branch** (routed to another role, e.g., Risk Analyst); on return and a subsequent approve/override → **Approved**. (Detailed routing is an FS-02+ concern; the architectural effect is that the case is not Approved until a decision returns.)
- **Resulting screen:** Multi-Agent Workspace (Executive Report becomes reachable).
- **Refresh scope:** global (decision state changes report-eligibility and decision controls).

### 7.6 T6 — Generate Executive Report
- **Trigger:** `intent:generateReport`.
- **Precondition:** `currentInvestigation` present with a recorded decision (case = **Approved**).
- **State effect:** produce the report payload from `currentInvestigation` and bind it to that investigation.
- **Lifecycle effect:** none (still **Approved**; not yet **Closed**).
- **Resulting screen:** Executive Report.
- **Refresh scope:** global (report view rendered; close becomes reachable).

### 7.7 T7 — Close Case
- **Trigger:** `intent:confirmClose`.
- **Precondition:** `currentInvestigation` present with decision and generated report.
- **State effect (ordered):** (1) finalize/retain the trail; (2) case → **Closed**; (3) on leaving the screen, **destroy `currentInvestigation`** and clear `selectedCase` (the closed case leaves the active queue). The destruction contract in §8 applies in full.
- **Lifecycle effect:** case → **Closed** (terminal).
- **Resulting screen:** Investigation Queue (the case no longer appears as active) or Dashboard.
- **Refresh scope:** global.

### 7.8 T8 — Change Case While One Is Active (the critical transition)
- **Trigger:** `intent:selectCase(newCaseId)` while `currentInvestigation` exists (e.g., user returns to queue and picks a different row).
- **Precondition:** `selectedCategory` present.
- **State effect (ordered, mandatory order):** (1) **destroy the existing `currentInvestigation`** (per §8); (2) set `selectedCase = newCaseId`; (3) `currentInvestigation` is absent until a new launch.
- **Lifecycle effect:** none on the new case (returns to preview); the prior case retains whatever lifecycle state it had reached.
- **Resulting screen:** Case Preview (for the new case).
- **Refresh scope:** **global** — every component is re-rendered for the new case so that **no stale merchant, evidence, timeline, conversation, findings, or report from the prior case can remain** (AC-01-080).

### 7.9 T9 — Backward Navigation
- **Trigger:** `intent:back`.
- **Precondition:** there is a defined predecessor screen.
- **State effect:** apply the state-reduction rule (§4.4) for the destination screen, destroying downstream state in downstream-first order; where this crosses below the Multi-Agent Workspace, the §8 destruction contract applies in full.
- **Lifecycle effect:** none on persisted case state already recorded.
- **Resulting screen:** the predecessor.
- **Refresh scope:** global.

### 7.10 Rejected transitions
Any trigger whose precondition is unmet MUST be **rejected without state change** and without navigation, and MUST surface the appropriate blocked/error condition (see FS Error States in PRD §18 for the error catalogue). A rejected transition never partially mutates state.

---

## 8. Investigation Destruction Rules

### 8.1 Purpose
This section makes explicit, in one place, **exactly when the active Investigation MUST be destroyed and what destruction entails.** Several transitions in §7 reference destruction; this section is the single authoritative destruction contract they all defer to. Its purpose is to guarantee that no fragment of a prior investigation can ever survive into a different case or a fresh session.

### 8.2 Destruction triggers (events that MUST destroy the active Investigation)
The active Investigation MUST be destroyed when any of the following occurs:
1. **Category changes** — `selectedCategory` is set to a different value (§7.1).
2. **Investigation Case changes** — `selectedCase` is set to a different value, including the critical change-case transition (§7.2, §7.8).
3. **Backward navigation beyond the Investigation Workspace** — any backward move that leaves the Multi-Agent Workspace toward Case Preview, Investigation Queue, Category, or Dashboard (§4.4, §7.9).
4. **Case closure** — on exit from Close Case after the case is finalized (§7.7).
5. **Explicit application reset** — any reset of the application to its initial state.

### 8.3 What MUST be destroyed
When destruction occurs, the application MUST destroy **all** of the following together, as a single atomic action:
- `currentInvestigation` (the Investigation object itself)
- Agent reasoning
- Agent conversation
- Evidence cache
- Timeline
- Recommendations
- Executive Report
- Confidence calculations

No subset of these may be retained. Destruction is all-or-nothing: it is illegal for any one of the above to outlive the others.

### 8.4 No-survival rule (normative)
**No previous Investigation data may survive a destruction event.** After destruction:
- No component may read, render, or cache any part of the destroyed investigation.
- `currentInvestigation` is absent (state level returns to at most `selectedCategory` + `selectedCase`, per the triggering transition).
- A **new Investigation is created only after the user explicitly launches a new Investigation** (T3, §7.3). Destruction never auto-creates a replacement; the system never rebuilds an investigation implicitly.

### 8.5 Why this prevents stale state (rationale)
Because every business object of an investigation is owned solely by its case (§6) and is destroyed in full at every case/category boundary, it is structurally impossible for the application to display:
- a **stale merchant** (the merchant belongs to the destroyed case's data),
- a **stale Executive Report** (the report is destroyed with the investigation),
- a **stale timeline** (the timeline is destroyed with the investigation),
- **stale AI conversation or reasoning** (agent conversation and reasoning are destroyed with the investigation), or
- **stale evidence, recommendations, or confidence** (all destroyed together).

The combination of single ownership (§6), single-object cardinality (§5, INV-1/INV-4), full destruction (this section), and explicit-launch-only creation (§8.4) is the architectural mechanism that eliminates the entire class of stale-state and cross-case-contamination defects.

### 8.6 Conformance
Verified by AC-01-080 (no residual prior-case data after a case change), AC-01-081 (investigation object count is 0 or 1), AC-01-083 (close destroys the investigation and the case leaves the queue), and AC-01-062 (a different case destroys any existing investigation before the new selection). Supports invariants INV-1, INV-3, INV-4, and INV-11.

---

## 9. Investigation Lifecycle

### 9.1 Lifecycle states (case-level)
The investigation lifecycle is expressed as the case lifecycle defined in PRD §13, with the architectural transitions made explicit here.

```
New → Queued → Investigating → Awaiting Human Review → Approved → Closed
                                       │
                                       └──(escalate)──► Escalation branch ──► (return) ──► Approved
```

### 9.2 State definitions and entry/exit
| State | Entered when | `currentInvestigation` exists? | Exit when |
|---|---|---|---|
| **New** | case is formed (transactions grouped) | no | placed into the queue |
| **Queued** | case is in the Investigation Queue, prioritized | no | a user previews and then **launches** |
| **Investigating** | T3 Launch performed; agents running | **yes (built)** | all agents complete |
| **Awaiting Human Review** | agents complete; findings ready | yes | a human decision is recorded (T5) |
| **Approved** | T5 approve/override recorded (or escalation returns approved) | yes | report generated and case closed |
| **Closed** | T7 confirmed | **no (destroyed on exit)** | terminal |
| **Escalation branch** | T5 escalate recorded | yes | validating role returns the case to the decision path |

### 9.3 Detection-through-closure narrative (architectural)
1. **Detection / formation (New):** A concentration of failed transactions is grouped into a unique case (grouping logic is an FS-02+ concern). No investigation object exists yet.
2. **Queued:** The case appears in the Investigation Queue for its category, ranked by priority. Still no investigation object.
3. **Preview (still Queued):** The user selects the case; `selectedCase` is set; Case Preview renders read-only scope. No investigation object yet.
4. **Launch → Investigating:** The user launches (T3). `currentInvestigation` is **built** as the single source of truth and bound to the case. The Manager Agent orchestrates the sequential agent run; evidence and findings accumulate **in place** on that one object (T4). The agent dependency order is defined in §10.
5. **Awaiting Human Review:** Agents complete; the Manager Agent has validated consistency; findings, recommendations, and confidence are presented. The case awaits a person.
6. **Decision (T5):** The human approves, overrides, or escalates. Approve/override → Approved. Escalate → escalation branch → returns → Approved.
7. **Report (T6):** The Executive Report is generated from the same investigation object.
8. **Close (T7 → Closed):** The case is finalized; the full trail is retained; `currentInvestigation` is destroyed on exit (§8); the closed case leaves the active queue.

### 9.4 Lifecycle invariants
1. `currentInvestigation` exists **only** in states Investigating, Awaiting Human Review, Approved, and Escalation branch. It MUST NOT exist in New, Queued, or after Closed.
2. The case MUST NOT advance to Approved without a recorded human decision.
3. The case MUST NOT advance to Closed without both a decision and a generated report.
4. A case in an error/failed investigation state (PRD §18) MUST NOT advance to Approved, report, or close.

---

## 10. AI Agent Dependency Model

### 10.1 Purpose
This section defines the **orchestration architecture** of the multi-agent investigation: the fixed execution order of the agents and the dependency rules that bind them. It describes **architectural dependencies only** — not prompts, model behavior, or any implementation detail (those are out of scope here and for FS-01 entirely). The agents operate on the single `currentInvestigation` object (§5) within the **Investigating** lifecycle state (§9).

### 10.2 Execution order
The agents execute in this fixed sequence, orchestrated by the Manager Agent:

```
Manager Agent
      ↓
Classification Agent
      ↓
Root Cause Agent
      ↓
Recovery Agent
      ↓
Revenue Impact Agent
      ↓
Executive Agent
```

### 10.3 Dependency rules (normative)
1. **Agents execute sequentially.** Execution proceeds one agent at a time in the order above.
2. **Agents do not execute in parallel.** No two agents run concurrently; there is no fan-out or concurrent stage.
3. **Every agent depends on upstream outputs.** Each agent consumes the accumulated outputs of all agents that precede it.
4. **Agents cannot skip earlier stages.** A downstream agent MUST NOT run until every upstream agent has completed; stages cannot be bypassed or reordered.
5. **Agents cannot modify completed upstream outputs.** Once an upstream agent's output is recorded, it is immutable to downstream agents; a downstream agent may build upon it but MUST NOT alter or overwrite it.
6. **Agents append findings to the same Investigation object.** All agents write into the one `currentInvestigation` (§5); no agent creates a separate or parallel investigation object.
7. **Every agent contributes evidence.** Each agent adds inspectable evidence to the case's Evidence collection (owned by the case, §6); conclusions without contributed evidence are not permitted.
8. **Confidence accumulates throughout the investigation.** Confidence is built up across the sequence; each agent contributes to the overall confidence picture rather than resetting it, and low-confidence states propagate forward.
9. **The Executive Agent consumes the outputs of every previous agent.** The final agent depends on the complete, validated chain — classification, root cause, recovery, and revenue impact — to produce the Executive Report.

### 10.4 Relationship to orchestration and consistency
The **Manager Agent** is the orchestrator: it initiates the sequence, enforces the ordering and no-skip rules, and validates overall consistency (evidence supports conclusions; no agent contradicts a validated upstream output) before the investigation transitions to **Awaiting Human Review** (§9). The dependency chain is linear and forward-only; there is no backward mutation and no parallelism.

### 10.5 Conformance
This model operates entirely within the single-object and lifecycle guarantees already specified: the agents mutate one `currentInvestigation` in place (INV-1, INV-2, AC-01-081, AC-01-101), append rather than duplicate (no second investigation object), and run only during the **Investigating** state (INV-11, AC-01-072). Evidence ownership follows §6. The in-place progress refresh during this sequence is governed by §11.4.

### 10.6 Investigation Consistency Principle (normative)
For the **same Investigation Case** operating on the **same underlying evidence**, the agent workflow MUST produce a **consistent investigation outcome**. Specifically, the following analytical conclusions MUST remain consistent across repeated runs of the workflow on unchanged case data:
- the **classification** (the dominant failure pattern),
- the **root cause** determination,
- the **recovery recommendations** (the recommended action set and its trade-off ranking),
- the **confidence range**, and
- the **executive conclusions** (the substantive findings carried into the Executive Report).

**What MAY vary:** wording, phrasing, narrative ordering, and presentation. Natural-language differences in how a conclusion is expressed are acceptable.

**What MUST NOT vary:** the analytical conclusions above. They MUST NOT change unless the **underlying case data changes** (e.g., new or altered transactions or evidence). Identical case data MUST NOT yield a different classification, a different root cause, a materially different recommendation set, a confidence outside the established range, or different executive conclusions.

**Scope and boundaries.** This principle constrains the *analytical determinism of conclusions*, not the prose. It is an architectural behavior requirement; the means by which determinism is achieved is an implementation concern and is intentionally not specified here. The principle complements §10.3 (sequential dependency, immutable upstream outputs) and §10.4 (Manager-Agent consistency validation): a consistent, validated dependency chain over fixed inputs is what makes a repeatable outcome possible.

---

## 11. Refresh Behaviour

### 11.1 Refresh contract (normative)
Every state change produces a **single, global, coherent refresh** of all components whose inputs derive from the changed state. The UI is a pure render of current global state (PRD Principle 7). There is **no** partial refresh that updates one panel while leaving a sibling showing prior-case data.

### 11.2 Refresh trigger → refresh scope matrix
| Transition | Components that MUST refresh |
|---|---|
| T1 Select Category | NavigationController (active screen → Queue); QueueHeader; QueueList + all QueueRows; any workspace/report/close context cleared |
| T2 Select (Preview) Case | Active screen → Case Preview; CaseSummaryPanel; TransactionGroupSummary; RiskIndicatorPanel; LaunchInvestigationControl; **all prior workspace/report components discarded** |
| T3 Launch Investigation | Active screen → Workspace; AgentTimeline; EvidencePanel; FindingsPanel; ConfidenceIndicator; DecisionControl (eligibility) |
| T4 Investigation Progress | AgentTimeline; EvidencePanel; FindingsPanel; ConfidenceIndicator; DecisionControl (eligibility when review-ready) |
| T5 Human Decision | DecisionControl (state); FindingsPanel (decision annotation); report-eligibility; NavigationController (Executive Report now reachable) |
| T6 Generate Report | Active screen → Executive Report; ReportView; close-eligibility |
| T7 Close Case | Active screen → Queue/Dashboard; QueueList (closed case removed); workspace/report context destroyed |
| T8 Change Case (critical) | **Entire application** — AgentTimeline, EvidencePanel, FindingsPanel, ConfidenceIndicator, DecisionControl, ReportView, CaseSummaryPanel, TransactionGroupSummary, RiskIndicatorPanel — all re-rendered for the new case; nothing from the prior case remains |
| T9 Backward Navigation | Active screen → predecessor; all downstream-bound components discarded per §4.4 |

### 11.3 Components that MUST always re-render on `currentInvestigation` change
On **any** rebuild or destruction of `currentInvestigation`, the following MUST refresh together (or be discarded together) so none can show stale data:
- AgentTimeline (agent conversation/reasoning)
- EvidencePanel (evidence)
- FindingsPanel (classification, root cause, impact, recovery)
- ConfidenceIndicator
- DecisionControl
- ReportView
- CaseSummaryPanel, TransactionGroupSummary, RiskIndicatorPanel (preview context for the bound case)

### 11.4 In-place progress refresh
During T4 (investigation progress), the same `currentInvestigation` is mutated in place; the workspace content components (§11.3, workspace subset) refresh to reflect accumulated agent output. This is the **only** refresh that occurs without a navigation or selection change, and it MUST NOT create a second investigation object.

### 11.5 Refresh prohibitions
1. No component refreshes from a data source other than current global state.
2. No partial refresh may leave two components rendering different cases.
3. No cached prior-case render may survive a `currentInvestigation` change.

---

## 12. Application Invariants

These statements MUST hold at all times. Each is paired with acceptance criteria in §13.

**INV-1 — Single active investigation.** At most one `currentInvestigation` exists at any moment. (AC-01-090)

**INV-2 — One source of truth.** Every screen/component renders investigation data exclusively from `currentInvestigation`. No alternate or derived copy of investigation state exists. (AC-01-091)

**INV-3 — No stale data.** After any state change, no component displays data from a previously selected case, category, or destroyed investigation. (AC-01-080, AC-01-092)

**INV-4 — No duplicated investigation.** Launching, changing cases, or re-entering the workspace never yields two investigation objects; the prior is destroyed before a new one is built. (AC-01-090, AC-01-081)

**INV-5 — State level consistency.** `selectedCase` cannot exist without `selectedCategory`; `currentInvestigation` cannot exist without `selectedCase`. (AC-01-093)

**INV-6 — Case ownership / no contamination.** A case only ever displays its own merchant, transactions, evidence, investigation, and report; business objects are never shared between cases (§6). (AC-01-031, AC-01-032)

**INV-7 — Deterministic navigation.** No screen is reachable unless its guards (§4.1) are satisfied; invalid entries resolve to the furthest valid screen. (AC-01-040..045)

**INV-8 — Human decision gate.** No case reaches Approved without a recorded human decision; none reaches Closed without a decision and a generated report. (AC-01-070, AC-01-071)

**INV-9 — Single owner of mutation.** Only GlobalStateProvider mutates global state; only NavigationController changes the active screen. (AC-01-010, AC-01-011)

**INV-10 — Atomic, global refresh.** Every committed transition produces exactly one coherent refresh of all dependent components; rejected transitions produce none. (AC-01-082, AC-01-060)

**INV-11 — Investigation existence window.** `currentInvestigation` exists only in states Investigating, Awaiting Human Review, Approved, and Escalation branch — never in New, Queued, or after Closed. (AC-01-072)

**INV-12 — No execution of recovery actions.** The architecture never triggers an external recovery action; decision outputs are recommendations/records only. (AC-01-073)

**INV-13 — Complete destruction on boundary.** On any destruction trigger (§8.2), the entire investigation — object, agent reasoning, agent conversation, evidence cache, timeline, recommendations, report, and confidence — is destroyed together; no fragment survives, and a replacement is created only by explicit launch. (AC-01-080, AC-01-081, AC-01-083)

**INV-14 — Sequential agent dependency.** Agents execute strictly in order (Manager → Classification → Root Cause → Recovery → Revenue Impact → Executive), never in parallel, never skipping a stage, and never mutating completed upstream output. (AC-01-110, AC-01-111)

**INV-15 — Investigation consistency.** For the same Investigation Case on the same underlying evidence, the workflow yields consistent analytical conclusions — classification, root cause, recommendation set, confidence range, and executive conclusions — varying only when the underlying case data changes; wording/narrative MAY differ. (§10.6, AC-01-113)

---

## 13. Architecture Acceptance Criteria

Acceptance criteria are normative and testable. Each is phrased so QA can construct a pass/fail test. IDs are stable references.

### 13.1 Ownership & mutation
- **AC-01-010** — Attempting to mutate `selectedCategory`, `selectedCase`, or `currentInvestigation` from any component other than GlobalStateProvider MUST have no effect on global state.
- **AC-01-011** — Changing the active screen from any component other than NavigationController MUST have no effect.
- **AC-01-012** — No component instance retains case data after its inputs are cleared (verify no stale render persists after state reduction).

### 13.2 Screen & component integrity
- **AC-01-030** — Exactly one screen is active at all times; tests MUST never observe zero or two active screens.
- **AC-01-031** — Selecting any `QueueRow` opens that row's own case in Case Preview; for a queue of N cases, selecting each of the N rows yields N distinct cases with no overlap.
- **AC-01-032** — In the Multi-Agent Workspace, AgentTimeline, EvidencePanel, FindingsPanel, ConfidenceIndicator, and DecisionControl all reference the same `currentInvestigation` and the same case identity.

### 13.3 Navigation
- **AC-01-040** — Each forward transition in §4.1 succeeds only when its guard holds, and is rejected otherwise.
- **AC-01-041** — Dashboard→Workspace, Category→Workspace, and Queue→Workspace (without launch) MUST be blocked and resolve to the furthest valid screen.
- **AC-01-042** — Case Preview→Executive Report MUST be blocked while no investigation/decision exists.
- **AC-01-043** — Any attempt to reach Executive Report without a `currentInvestigation` MUST resolve away and MUST NOT render the report screen.
- **AC-01-044** — Backward navigation to Category clears `selectedCase` and destroys `currentInvestigation`; backward to Queue destroys `currentInvestigation` and clears `selectedCase`; backward to Case Preview destroys `currentInvestigation` and retains `selectedCase`.
- **AC-01-045** — A deep link/stale link to any guarded screen with insufficient state resolves to the furthest valid screen and never renders against missing state.

### 13.4 State transitions
- **AC-01-060** — Every transition in §7 is atomic: on rejection, no global state object changes and no navigation occurs.
- **AC-01-061** — T1 with a different category set destroys any existing `currentInvestigation` and clears `selectedCase` before setting the new category.
- **AC-01-062** — T2/T8 with a different case destroys any existing `currentInvestigation` before setting the new `selectedCase`, and leaves `currentInvestigation` absent until launch.
- **AC-01-063** — T3 builds exactly one `currentInvestigation` and only when `selectedCase` is present and no investigation exists.

### 13.5 Lifecycle & decision gate
- **AC-01-070** — A case cannot transition to Approved without a recorded human decision (approve/override, or escalation returning approved).
- **AC-01-071** — A case cannot transition to Closed unless it is Approved and an Executive Report has been generated.
- **AC-01-072** — `currentInvestigation` exists in Investigating / Awaiting Human Review / Approved / Escalation branch only; it MUST be absent in New, Queued, and after Closed.
- **AC-01-073** — No transition emits or triggers an external recovery action; decision outputs are recorded recommendations only.

### 13.6 Single-investigation & no-stale-data (the critical guarantees)
- **AC-01-080** — After T8 (change case), no component displays the prior case's merchant, transactions, evidence, timeline, agent conversation, findings, confidence, or report. (Test: launch case A, advance to findings, return to queue, open case B → verify zero residual A data anywhere.)
- **AC-01-081** — At no observable point do two `currentInvestigation` objects coexist (instrument the owner; count MUST be 0 or 1).
- **AC-01-082** — A committed transition triggers exactly one global refresh; no panel is observed showing a different case than its siblings at any time after refresh completes.
- **AC-01-083** — Closing a case (T7) removes it from the active queue and destroys `currentInvestigation`; re-entering the queue shows no active investigation.

### 13.7 Invariant conformance
- **AC-01-090** — INV-1/INV-4: investigation object count is always ≤ 1 across all operations including rapid case switching.
- **AC-01-091** — INV-2: all investigation reads trace to the single `currentInvestigation`; no alternate source is readable.
- **AC-01-092** — INV-3: a full sweep of all rendered components after any transition shows a single, consistent case identity (or none).
- **AC-01-093** — INV-5: it is impossible to construct a state with `selectedCase` and no `selectedCategory`, or `currentInvestigation` and no `selectedCase`.

### 13.8 Refresh conformance
- **AC-01-100** — Each transition refreshes exactly the component set listed in §11.2 and no stale sibling remains.
- **AC-01-101** — T4 progress updates mutate the same investigation object (object count unchanged) and refresh only the workspace content subset.
- **AC-01-102** — No component re-renders from any source other than current global state (verified by removing all non-global inputs and observing renders depend solely on global state).

### 13.9 Data ownership & destruction
- **AC-01-103** — No Investigation, Evidence collection, or Executive Report object is referenced by more than one case (verify object identity is unique per case across the full case set).
- **AC-01-104** — The Investigation Queue holds no persistent business data; recomputing it for a category yields the current cases and owns nothing downstream.
- **AC-01-105** — On every destruction trigger (§8.2), all eight destruction targets (§8.3) are gone together; a partial-destruction state (any one surviving) MUST never be observable.
- **AC-01-106** — After destruction, no new investigation exists until an explicit launch (T3); the system never auto-recreates an investigation.

### 13.10 Agent dependency conformance
- **AC-01-110** — Agents are observed to complete strictly in the order Manager → Classification → Root Cause → Recovery → Revenue Impact → Executive; no agent starts before its predecessor completes.
- **AC-01-111** — No two agents are active simultaneously, and no completed upstream output is modified by a downstream agent (verify upstream outputs are immutable once recorded).
- **AC-01-112** — Every agent contributes at least one evidence item to the case's Evidence collection, and all contributions write to the single `currentInvestigation`.
- **AC-01-113** — INV-15 (Investigation Consistency): running the workflow twice on the same case with unchanged evidence yields the same classification, the same root cause, an equivalent recommendation set (same actions, same trade-off ranking), a confidence value within the established range, and equivalent executive conclusions; only wording/narrative may differ. Any divergence in these conclusions without a change to the underlying case data is a failure.

---

*End of FS-01 — Application Architecture. This document defines architecture and behavior only. Subsequent functional specifications (FS-02 onward) will not begin until FS-01 is reviewed and approved.*
