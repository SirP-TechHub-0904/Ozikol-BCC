# Project Rules & Permanent Memory Bank (Ozikol-BCC)

This document serves as the permanent memory bank and behavioral guidelines for all AI coding agents working in this repository. These rules apply to every prompt and session.

---

## 1. Code Documentation & Comments (Mandatory)
* **XML Documentation**: Every newly created or modified class, interface, method, and property MUST include clear, professional XML documentation (`/// <summary>`).
* **Parameter & Return Docs**: Methods must document parameters (`/// <param name="...">`) and return values (`/// <returns>`).
* **Inline Explanations**: Any non-trivial business logic, database queries, calculations, cryptographic operations, or error-handling blocks must have concise inline comments explaining the *intent* and *why*, not just repeating what the code does.
* **No "Naked" Code**: Never generate bare functions or classes without contextual documentation. Preserve all existing unrelated comments.

---

## 2. Git Branching & Commit Standards
* **Separate Branches Mandatory**: Never commit directly to the `master` branch. Always create and work on a dedicated, descriptive branch before making changes or committing:
  * Features: `feat/<feature-name>` or `feature/<feature-name>`
  * Bug fixes: `fix/<bug-name>`
  * Maintenance / refactoring / cleanup: `chore/<task-name>` or `refactor/<task-name>`
* **Commit on Dedicated Branch**: Upon completing a feature, milestone, or significant refactoring, create clean Git commits on the active task branch.
* **Descriptive Commit Messages**: Follow the Conventional Commits specification:
  * Format: `<type>(<scope>): <concise summary>` followed by a bulleted body explaining what changed and why.
  * Types: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`.
  * Example:
    ```
    feat(central-ui): integrate ozikol-ui design suite into central portal

    - Replaced old wwwroot assets with new theme, fonts, and scripts
    - Imported 60+ modular feature, corporate, and marketplace pages
    - Updated namespace to Ozikol.Central.Pages with 0 compilation errors
    ```

---

## 3. Architecture & Strict Rules
* **No Hardcoded Connection Strings / Secrets**: Never provide hardcoded connection strings or dummy fallbacks in code. Always resolve from `.env` or environment variables and throw clear descriptive `InvalidOperationException` if missing.
* **Master vs. Tenant Layer Isolation**:
  * Master Catalog persistence lives strictly in `Ozikol.MasterDomain` and `Ozikol.MasterPersistence.EF.MasterSQL`.
  * Tenant persistence lives strictly in `Ozikol-BCC.Domain` and `Ozikol-BCC.Persistence.EF.SQL`.
  * Never cross-contaminate models, contexts, or migrations between Master and Tenant.
* **Planning Before Modification**: Always provide a structured implementation plan and obtain user approval before modifying, deleting, or moving files across project boundaries.
