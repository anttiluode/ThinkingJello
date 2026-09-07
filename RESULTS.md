# A completed loop, with a small and explicit claim

ThinkingJello learns a causal filter from outgoing pings to local returns. The live
page is the instrument; these measurements check its underlying numerical engine.

The six seeds vary pulse timing, pulse signs and sensor noise. Geometry is fixed for
this receipt, the body is stationary, and no external disturbances occur during the
initial 1,800 learning steps. Prediction is then evaluated on 360 **future** steps
with learning frozen. No outcome labels or reflector coordinates enter the learner.

| Seed | Future return explained | Copy removed | After reflector relearning |
|---|---:|---:|---:|
| 7 | 99.9974% | 0% | 99.9978% |
| 19 | 99.9986% | 0% | 99.9982% |
| 42 | 99.9972% | 0% | 99.9912% |
| 73 | 99.9988% | 0% | 99.9962% |
| 101 | 99.9987% | 0% | 99.9931% |
| 731 | 99.9954% | 0% | 99.9981% |

Here “explained” is `1 - sum(residual²)/sum(return²)` on the evaluation window.
The deliberately linear stationary pond is well suited to a learned FIR filter.
These high scores establish a functioning implementation, not a novel algorithm.

Moving one reflector while freezing the model increases residual MSE by **2,925–10,102×**
relative to the familiar-world baseline. After 1,400 relearning ticks the old mismatch
is largely cancelled again. One injected middle-band pulse produces a peak residual
**89–226×** the familiar peak. These large ratios partly reflect the low noise floor.
They are not a real-world detection AUC, false-positive measurement or generalization
test across different environments.

Other direct checks pass:

- The same external middle-band intervention leaves low/high observations and learned
  coefficients **bit-for-bit unchanged** when motion is held off. That isolation is
  a consequence of the explicit separate channels.
- A snapshot resumes identically through 420 future ticks, including pending echoes
  and a mismatch-triggered movement.
- Frozen coefficients remain unchanged when the outside return changes.
- Current observations do not affect predictions already made for that tick.
- A 6,500-tick disturbed/moving run remains finite with bounded event history.
- Invalid memory data is rejected.

All seven Node tests pass. A separate offline canvas execution exercised both drawing
modes and checked referenced DOM IDs without exceptions. That is not browser layout
QA. The microphone path has not been validated with a real speaker, microphone or
virtual audio cable in this session; it is an optional experimental adapter.

## What this adds to the series

The old question becomes something Antti can run and keep:

**I issued a pulse. I expected a return. The return disagreed. The disagreement
changed what I did next. I can preserve the expectation and repeat the intervention.**

This is adaptive system identification plus a small supplied behavior rule and a
visual body. It does not solve JelloBrain's representational interference by itself,
and no learned planning, conceptual thought or consciousness is established.

Raw values and protocol: [results/measurement.json](results/measurement.json).
Reproduce: `node --test tests/core.test.cjs` and `node tests/measure.cjs`.
