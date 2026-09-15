# Ozikol-BCC
Ozikol Business Control Center (BCC) & Central Multi-Tenant Platform.

---

## Git Workflow & Branching Strategy

> **IMPORTANT**: Direct pushes and local merges to `master` are strictly disabled. All features, fixes, and updates must be pushed on dedicated task branches and merged via **GitHub Pull Requests**.

### 1. Branch Naming Conventions
Always create a descriptive branch off `master` before writing code or committing:
* **Features**: `feat/<feature-name>` or `feature/<feature-name>`
  * Example: `feat/templates-page-section`
* **Bug Fixes**: `fix/<bug-name>`
  * Example: `fix/online-tenant-cors-api-url`
* **Refactoring & Maintenance**: `refactor/<name>` or `chore/<name>`
  * Example: `chore/cleanup-python-scripts`
* **Documentation**: `docs/<topic>`
  * Example: `docs/git-branching-guidelines`

### 2. Pull Request & Deployment Workflow
1. Work and commit strictly on your dedicated branch.
2. Push your branch to GitHub: `git push -u origin <branch-name>`.
3. Open a GitHub Pull Request into `master`.
4. Review and merge the Pull Request on GitHub. GitHub Actions CI/CD workflows will automatically trigger to build and deploy the affected components (API, Client, Central) to the VPS.

### 3. Commit Message Standards
Follow the Conventional Commits specification:
* **Format**: `<type>(<scope>): <concise summary>` followed by a bulleted body explaining what changed and why.
* **Types**: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`.
* **Example**:
  ```
  feat(content): implement page section list templates

  - Added PageSection models and hydration service
  - Bound dynamic form fields in admin template editor
  - Verified clean compilation with 0 errors
  ```

---

## Architectural Rules

1. **Master vs. Tenant Isolation**:
   * Master Catalog persistence is isolated in `Ozikol.MasterDomain` and `Ozikol.MasterPersistence.EF.MasterSQL`.
   * Tenant persistence is isolated in `Ozikol-BCC.Domain` and `Ozikol-BCC.Persistence.EF.SQL`.
   * Never cross-contaminate models, contexts, or migrations between Master and Tenant.
2. **Configuration & Secrets**:
   * No hardcoded connection strings or secrets. All values resolve from `.env` or system environment variables.
3. **Documentation**:
   * All classes, public methods, and properties require complete XML documentation comments (`/// <summary>`).
