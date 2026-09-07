# One loop, made visible

The engineering target is **a body that can learn what its own ping should cause**.
The output is a working instrument, not a new claim about how the brain works.

## World

The pond is a linear first-order acoustic ray toy with three separable bands,
four local sensors and three movable point reflectors. Coordinates span 1.5 × 1.
Time is discrete at 30 model ticks per second; UI speed changes simulated time only.

An outgoing command is an impulse in one band, with randomized sign and timing.
The same command is simultaneously sent to the world and to the observer. At distance
`d`, an event launched at `t0` contributes

```
s = t - t0 - d / 0.028
k_b(s) = exp(-s/9) sin(omega_b s),  0 <= s <= 46
y_b = amplitude * k_b(s) / (1 + 1.6 d)
omega = [0.32, 0.65, 1.05] radians/tick
```

Each reflector emits one delayed secondary event at arrival time `t0 + d/0.028`,
with gain `reflector_gain / (1 + 2d)`. There are no recursive reflections. Independent
small observation noise is added to each sensor. These are dimensionless simulation
parameters, not a calibrated underwater or biological model. The rings show event
wavefront envelopes; exact signed sensor values come from the equation above.

Moving a reflector changes future reflections. Echoes already en route keep their
original launch positions, as specified by this discrete event approximation.

## Observer and the internal copy

For each band, the observer retains 192 delayed outgoing command values (6.4 model
seconds). For each of four sensors it learns a separate impulse response `w`:

```
x_b(t) = [u_b(t), u_b(t-1), ..., u_b(t-191)]
prediction_b,e(t) = dot(w_b,e, x_b(t))
residual_b,e(t) = observation_b,e(t) - prediction_b,e(t)

w <- w + rate * clip(residual, -.35, .35) * x / (.08 + dot(x,x))
```

This is a normalized least-mean-squares adaptive FIR filter, with rate 0.65 in the
pond and 0.38 in the room. Prediction happens **before observing the current return**.
The displayed residual is pre-update. Tiny errors below 0.0005 do not update weights.
Clipping limits the influence of large errors but is not a reliable external-event
classifier; persistent or action-correlated disturbances can still be learned.

The predictor receives only commands and observations. It has no access to the world
object, position, reflector list, disturbance label, or planned future command. Turning
off the internal copy sets its input features to zero; existing weights are retained.
Turning off learning leaves prediction active. Separate band parameters prevent writes
in one band directly modifying another; **this addressing is supplied by construction**.

An unexplained return can mean an external event, an imperfect model, a changed body
position, noise or insufficient training. It is not a guaranteed causal attribution.
The internal copy records pings, not a learned motor forward model.

## Behavior and drawing

The small supplied policy smooths differences between opposing sensors' squared residuals.
After initial calibration, enough residual energy can trigger a short motion in that
gradient direction, followed by a refractory interval. No reflector coordinates or
disturbance labels are used. This is a local curiosity heuristic, not trained planning
or a demonstrated ability to locate an arbitrary source. It can react to its own
model errors. Movement changes the sensor geometry and requires relearning.

The shape is a rendering, not a simulated elastic organism. Each visible fibre corresponds
to a learned delay coefficient, with intensity affected by that coefficient and prediction.
Sensor returns deform the membrane; residuals light its amber interior and sensor tips.
Low-amplitude breathing and moving particles aid visibility and are cosmetic.

The fit meter is `clip(1 - EMA(residual^2) / EMA(observation^2), 0, 1)`, summed over bands
and sensors. It measures recent cancellation, not intelligence, task reward, validation
accuracy or percent of information understood. Online adaptation affects the live meter;
the automated measurements also evaluate with learning frozen on future commands.

## Delay portrait and the older work

The small phase portrait displays `(y(t), y(t-8), y(t-16))` in a rotating projection.
It follows Slider2's signal-history idea. This is not a demonstration of the hypotheses
of Takens' theorem, state reconstruction or hidden-state identifiability. The predictor
is an input-history system identifier, not a general nonlinear observer.

Spatial Tempest's attached code computes an echo/output power-spectrum ratio and DMD
of successive spectra. ThinkingJello uses a causal time-domain adaptive filter instead.
We neither port its mode extractor nor interpret a power-spectrum ratio as a complete
complex transfer function. Its useful inheritance is the probe/return relationship.

JelloBrain's main-branch final receipt at inspection ends with S13's interference failure.
Later experimental branches mentioned in the conversation are not promoted to established
results here. ThinkingJello makes explicit channel separation and a known adaptive filter
usable and inspectable; it does not claim that representational separation emerged.

## Real audio

Room mode emits 260, 650 and 1500 Hz short tone bursts and requests microphone access
with echo cancellation, noise suppression and automatic gain control disabled. Browsers
may interpret these constraints differently. The microphone is connected only to an FFT
analyser, never the audio output. A separate oscillator/gain path produces bounded pings.

The observer samples at nominal 30 Hz, sums spectral power near each carrier, takes its
square root and subtracts an initial two-second quiet baseline. The adaptive filter maps
command history to this nonnegative band-energy envelope. Real-time scheduling is best
effort. This is not a sample-accurate echo canceller, source separator, word recognizer,
coherence estimator or room impulse-response measurement. Negative residuals remain
visible even though the sensed envelopes are nonnegative.

Audio is not uploaded, retained, or included in canvas video. Optional exported room
memories contain learned filter coefficients and command traces, not raw microphone data.
There is no webcam: it would add another unvalidated sensing path without improving this loop.

## Persistence

Pond snapshots preserve both RNG states, model weights, command history, pending signals,
pose, controls, metrics and movement state. Loading is validated before the current world
is replaced. Auto-save is best effort per browser origin. Downloads provide portable
JSON. Room snapshots restore coefficients; opening the microphone remains a separate
user action and recalibrates the ambient baseline.

## Scope of evidence

`tests/core.test.cjs` checks held-out self-return prediction, copy removal, changed-world
mismatch and recovery, selective band interference, and exact snapshot continuation.
`tests/measure.cjs` writes a bounded multi-seed receipt. These checks cover the actual
browser numerical engine. A green check does not validate the microphone on real hardware,
the visual metaphor as physiology, or the movement heuristic as learned cognition.
