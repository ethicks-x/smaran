# Git Guidelines

### Commit Messages

Use the conventional format — precise, imperative, lowercase, no trailing period.

```
type(scope): message
```

- **type**: `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `test`, `perf`, `build`, `ci`
- **scope**: the area touched — `api`, `mobile`, `web`, `deps`, `ci`, or a package name
- **message**: what the commit does, in the present tense (~72 chars max)

``` bash
feat(api): add refresh token endpoint
fix(mobile): prevent crash on empty deck list
chore(deps): bump expo to sdk 52
refactor(web): extract card grid into component
```

Add a body only when the *why* isn't obvious from the subject line:

```
fix(api): retry failed sync jobs

The queue dropped jobs when redis restarted mid-flight.
```

### Atomic Commits

Keep the history clean and readable — one logical change per commit.

- Commit a single change at a time; do not dump bulk changes in one commit.
- Never mix a refactor, a feature, and a formatting pass together.
- Stage selectively when a file holds unrelated edits: `git add -p`
- Every commit should build and run on its own.
- Fix up mistakes before pushing: `git commit --amend` or `git rebase -i`

### Branching & Pushing

- Working in **your own domain** (`api`, `mobile`, or `web`): commit and push directly to `main`.
- **Collaborating in someone else's domain**: branch off `main` and open a PR — do not push directly.

``` bash
git switch main
git pull --rebase origin main
git switch -c fix/mobile-sync-crash
# ... work, commit ...
git push -u origin fix/mobile-sync-crash
```

Branch naming: `type/short-description` — e.g. `feat/web-search-bar`, `fix/api-auth-race`.

### Remote Management

``` bash
git remote -v                                  # list remotes
git remote add origin <url>                    # add the project remote
git remote set-url origin <url>                # switch protocol (https <-> ssh)
git fetch origin --prune                       # sync refs, drop deleted branches
git push origin --delete <branch>              # remove a merged remote branch
```

`origin` is the single source of truth. Do not add extra remotes to the shared repo; use a fork if you need one.

### Staying in Sync

Always rebase instead of merging to keep the history linear.

``` bash
git pull --rebase origin main
```

Set it as the default once, locally:

``` bash
git config pull.rebase true
```

Resolve conflicts, then `git rebase --continue`. Never force-push `main`; if you must force-push your own branch, use `git push --force-with-lease`.

### Before You Commit

A `pre-commit` hook runs `lint-staged` (format + lint on staged files). If it fails, fix the reported issues rather than bypassing it — `--no-verify` is not an option on shared branches.

### Rules of Thumb

- Never commit secrets, `.env` files, build output, or `node_modules`.
- Pull before you start working, and before you push.
- Do not commit commented-out code or debug logs.
- Review your own diff (`git diff --staged`) before every commit.
