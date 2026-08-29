# AI project knowledge

This directory is the persistent knowledge base for AI coding agents working in this repository.

## How to use

1. **Before implementing a task**, read this README and open every relevant file under `.ai/skills/`.
2. Prefer skill guidance over assumptions when project conventions and the general training prior disagree.
3. **After implementing a task**, follow [`skills/change-workflow.md`](skills/change-workflow.md) and update every affected skill file in the same change so docs stay synchronized with the code.
4. Treat these documents as living documentation: they describe the current system, not a wishlist.

## Skill map

| Skill                              | Use when                                                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `skills/change-workflow.md`        | Implementing changes, refactors, bug fixes, docs/tests updates, commits, verification choice, pre-push / post-change validation     |
| `skills/project-architecture.md`   | Choosing folders, module boundaries, or where new code belongs                                                                      |
| `skills/react-conventions.md`      | Writing React components, hooks, or examples                                                                                        |
| `skills/typescript-conventions.md` | Typing public APIs, generics, or imports                                                                                            |
| `skills/form-system.md`            | Using or changing `useForm`                                                                                                         |
| `skills/validation.md`             | Validation timing, adapters, or error shapes                                                                                        |
| `skills/testing.md`                | Adding or changing Vitest / Testing Library coverage                                                                                |
| `skills/code-quality.md`           | Lint, format, scripts, or review standards                                                                                          |
| `skills/package-release.md`        | Library build, exports, packing, size, Storybook, TypeDoc, GitHub Actions, npm publish, tags, Releases, Pages deploy, env approvals |

## Mandatory rule for all agents

> Before implementing a task, inspect the relevant files under `.ai/skills`. After implementing a task, classify the change, run the matching verification level from `skills/change-workflow.md` / `docs/development-workflow.md`, and update every affected skill file so the documentation remains synchronized with the actual code.

Never leave documentation describing behavior that no longer exists. Never document planned features as if they were already shipped.

Detailed post-change process: [`docs/development-workflow.md`](../docs/development-workflow.md).
