# Change-impact evaluation

Measured on 28 October 2026. **These results evaluate deterministic demo heuristics, not Jev. No live model accuracy, latency, token use or cost has been measured.**

## Dataset

Ten hand-authored, synthetic, non-sensitive scenarios are stored in `lib/server/jev/evaluation.ts`. Expected categories and review labels were written from scenario intent independently of the outputs. Inputs consist only of paths and synthetic added/deleted line counts; they do not include source diffs. A narrow documentation-only baseline labels documentation/tests accordingly, labels every other case business logic, and requests review for every non-documentation case.

| Scenario | Expected category | Review | Label rationale |
| --- | --- | --- | --- |
| Documentation only | Test/documentation | No | Explanatory prose only |
| Localized helper refactor | Refactor/maintenance | No | Extraction with no intended behavior change |
| Public endpoint | API contract | Yes | Consumer-facing contract change |
| SQL migration | Database/data model | Yes | Persistent schema change |
| Authorization | Security-sensitive | Yes | Access enforcement boundary |
| Package update | Dependency | Yes | Runtime/supply-chain change |
| Fifteen components | Business logic | Yes | Broad behavior change |
| Incomplete/ambiguous | Other/unclear | Yes | Intent and complete evidence missing |
| Unit tests only | Test/documentation | No | Test assertions only |
| Local build script | Refactor/maintenance | No | Tooling maintenance only |

## Executed results

| Metric | Deterministic demo + application policy | Documentation-only baseline |
| --- | --- | --- |
| Category accuracy | 9/10 (90%) | 3/10 (30%) |
| Review accuracy | 10/10 (100%) | 8/10 (80%) |
| Review true positives | 6 | 6 |
| Review true negatives | 4 | 2 |
| Review false positives | 0 | 2 |
| Review false negatives | 0 | 0 |
| Review precision | 100% | 75% |
| Review recall | 100% | 100% |

The demo misclassifies the localized helper refactor as business logic: the file path does not reveal whether behavior changed. The simpler baseline additionally misses API, database, security, dependency, ambiguous and build-maintenance categories. Its two review false positives are the localized refactor and build script.

## Reproduce

```sh
npm ci
npx vitest run lib/server/jev/evaluation.test.ts --reporter=verbose
```

The command prints the dataset size, mode, aggregate metrics and every prediction/label row, and asserts the recorded counts. Full validation also runs this evaluation through `npm test`.

## Limits and next live evaluation

This tiny, deliberately simple dataset is development coverage, not statistical evidence of real-world accuracy or safety. The same engineer authored labels and heuristics; this is not a held-out benchmark, an independent human study or proof of calibration. Broad changes and security boundaries need source inspection and independent tests. A public path may resemble a sensitive file without changing enforcement, or hide sensitive behavior under an ordinary name.

Demo probability maps are illustrative fixed numbers. They cannot be used to measure probability calibration or confidence quality. The reported gains compare two deterministic rulesets and establish no advantage of Jev over a baseline.

Once authorized credentials exist, freeze these labels and question/model versions, run the same normalized states through the pinned official adapter with explicit paid-call authorization, record actual returned model and usage, and publish raw non-sensitive predictions plus latency and aggregate metrics. Keep these deterministic results as a separate comparison and expand to a held-out dataset with actual bounded public-change evidence before tuning thresholds.
