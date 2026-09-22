
# MASTER PROMPT — ENTIRE CODE CONNECTION AUDIT
Paste this into any AI assistant (or a fresh chat here) together with your
project files, and it will trace how **every piece of the code connects**:
files → modules → services → database → pages → user journeys.

Works on any codebase, not just this one.

---

## THE PROMPT (copy everything between the lines)

```
Act as a senior software architect performing a READ-ONLY connection audit
of the entire codebase provided. Do NOT modify, rewrite, or judge style.
Your single objective: produce a complete, evidence-based map of how every
part of the code connects to every other part.

PROJECT CONTEXT (edit before pasting):
- Project: [NAME]
- Stack: [e.g. HTML + CSS + vanilla JS ES modules + Firebase]
- Entry points: [e.g. *.html pages loading js/main.js]
- Backend: [e.g. Firebase: Firestore, Auth, Storage; rules in *.rules]

AUDIT DIMENSIONS — cover ALL of them:

1. FILE INVENTORY
   List every source file with its role in one line
   (entry / component / service / core / config / data / styles / docs).

2. MODULE DEPENDENCY GRAPH
   For every module, list exactly what it imports (static AND dynamic
   import()). Present as a layered graph. Flag:
   - cycles (A→B→A)
   - orphans (imported by nothing and never used as an entry point)
   - cross-layer violations (e.g. UI code importing raw backend SDKs
     directly, bypassing the service layer)

3. BOOT / EXECUTION FLOW
   Trace what actually happens from first page load, in order:
   which script runs first, what it initializes, what depends on what,
   what can fail and what happens then.

4. PAGE → CODE → BACKEND MAP
   For every page/screen: its HTML shell, its page module, every service
   it calls, and every backend collection/endpoint those calls touch.

5. DATA FLOW PER USER JOURNEY
   Pick the [N] core user journeys (e.g. browse, add-to-cart, checkout,
   order management, auth). For each: trace the exact function call chain
   across files, including where state is read/written and where the
   database is touched. Present as arrow diagrams.

6. STATE & EVENT WIRING
   Map who broadcasts state/events and who subscribes
   (auth state, cart events, toasts, custom events, storage keys).
   Flag any component reading state through side channels.

7. BACKEND TOUCHPOINTS & SECURITY COVERAGE CROSS-CHECK
   - Every backend path referenced in code (collections, storage folders,
     auth methods, API routes) with the file+function that touches it.
   - Every rule/permission defined on the backend.
   - CROSS-CHECK: every code touchpoint must be covered by a rule;
     every rule that blocks code should be intentional. Flag mismatches.

8. EXTERNAL BOUNDARIES
   Every CDN, font, API, or third-party URL the code references, what
   loads it, and what happens offline / when it is blocked.

9. DEAD CONNECTIONS
   Unused exports, unreferenced files, styles defined but never applied
   (spot-check class names), event listeners registered on elements that
   don't exist.

10. CONNECTION HEALTH TABLE
    One row per major connection with status:
    CONNECTED (verified with evidence) / BROKEN (evidence) /
    RISKY (works but fragile — say why) / UNVERIFIED (couldn't verify).

METHOD RULES:
- VERIFY, don't assume: base every claim on actual grep/read results and
  quote the evidence (file:line). Run or request the grep commands if a
  terminal is available; otherwise read the files.
- When something cannot be verified, write [VERIFY] with the exact
  command the owner should run.
- Never invent files, functions, or connections.
- Do not propose refactors unless a connection is BROKEN; if you do,
  mark it clearly as a finding, not a change.

OUTPUT FORMAT:
- Sections 1–10 in order, tables and arrow/mermaid diagrams.
- End with a one-paragraph executive summary: is the architecture
  coherent, where are the weak joints, and the single most important
  thing to fix.
```

---

## QUICK VERSION (small projects / quick checks)

```
Map the entire code connection for this project: every import edge,
every page → script → service → database path, every backend
touchpoint cross-checked against security rules, every external URL.
Flag cycles, orphans, broken references, and uncovered backend paths.
Evidence only (file:line), read-only, end with a health table.
```

---

## TIP — using it on THIS project (Kadai)
The workspace file `kadai/docs/code-map.md` is the result of running
exactly this audit on Kadai. If you continue in a fresh chat, paste the
prompt above **and** attach the `kadai/` folder — the AI can re-verify the
map after any changes you make.


