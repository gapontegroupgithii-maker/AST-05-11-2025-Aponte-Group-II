# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/4bfaee8e-85be-4f16-8144-c152fb139e4a

# All Star Trading — AST (prototype)

All Star Trading (AST) is a web app prototype that aims to be a TradingView-like platform with support for a Pine Script–compatible language called Star Script (namespace `star.`). This repository contains a phased implementation plan: parser, transpiler, runtime sandbox, editor integrations and eventual IA-assisted translation and optimization.

Current status summary (short):

- Parser (hand-written) + Peggy grammar + adapter: present and tested.
- Runtime: lightweight evaluator and runner with series emulation and basic builtins (plot, input, request.security stub, strategy stubs).
- Transpiler: scaffold present; needs completion to reach MVP.
- Tests: vitest suite included and passing locally.

See `docs/star-spec.md` for the Star Script contract and mappings.

Quick start

```powershell
npm install
npm run dev
npm run test
```

Repository and contribution

This repository was prepared to be migrated to `git@github.com:gapontegroupgithii-maker/AST-04-11-2025.git` and includes CI workflows under `.github/workflows/` that run parser generation and tests.

If you plan to contribute, run the tests locally (`npm run test`) before creating a PR.

Contact / owner: g.aponte.group.github.ii@gmail.com
