# ThinkingJello

**[Open the echo pond](https://anttiluode.github.io/ThinkingJello/)**

A visible organism with a learned expectation of its own echo. It emits pulses,
keeps an internal copy, predicts what its local sensors should hear, and responds
to the difference. No install, paid API, pretrained model, or server computation.

## Try it

1. Watch for 15–30 seconds at the default 2× speed. Violet is the learned prediction;
   mint is the actual return. The amber residual should settle as its echo becomes familiar.
2. Click the pond or press **Send disturbance**. Only the chosen frequency band is excited.
3. Switch off **Learn the echo**, then **Move a stone**. Its expectation stays where it was;
   the world no longer agrees. Restore learning to let it adapt.
4. Switch off **Internal copy**. Even self-generated signals become unexplained.
5. **Save memory** keeps the learned model, pond, body, random generators and travelling
   signals. **Load memory** resumes that state. A browser auto-save also runs every 15 seconds.
6. **Cinema** hides the controls. **Record 20 s** saves a silent video of the actual canvas.

The organism can make a small movement toward a local residual gradient. This changes
its own echo too. Turn off **Follow a mismatch** to study learning in a stationary body.

## A window into the real room

Select **Listen to my room**, then enable the microphone. The browser listens to the
quiet background for two seconds and then emits a low-volume tone burst once per second,
cycling through three frequency bands. The same adaptive filter predicts the microphone's
band-energy envelope from a delayed copy of the outgoing commands.

Start with low speaker volume. Speak or clap after several rounds, or change the
speaker/microphone arrangement. A virtual audio cable can be selected in the input list;
choose the matching system output in the operating system. The microphone is never
routed back into the speaker. Stop, changing tabs, or hiding the page releases it.
No audio is uploaded or recorded. The optional video recorder records only the canvas.

Room mode is an experimental envelope predictor, **not acoustic echo cancellation**.
Headphones may prevent the microphone hearing any ping. Browser processing, latency,
nonlinear energy measurements and changing ambient noise can limit prediction. It has
not been validated on Antti's actual microphone or virtual cable. Room memories save
filter weights; reconnecting takes a fresh quiet baseline. Switching worlds keeps the
pond and room models separate.

## What carries forward

- **[JelloBrain](https://github.com/anttiluode/JelloBrain):** expected activity, meaningful
  mismatch and plasticity are separate jobs. Its shared-sheet reversal failure remains
  a failure; this project does not claim to resolve it through emergence.
- **[GelatinIsland](https://github.com/anttiluode/GelatinIsland):** let the state be visible,
  intervene directly, and preserve the organism instead of only a screenshot.
- **Slider2:** a known outgoing signal, a returned signal and a delay portrait.
- **Spatial Tempest:** the environment has a response to a probe. Here an online
  time-domain filter learns that response. No DMD or Koopman identification is claimed.

There are three separate frequency channels with separate weights. This separation is
**engineered**, making selective disturbance possible. The learned object is an impulse
response, not a grown JelloBrain material sheet. Fibres display its coefficients;
the membrane displays sensor activity. Motion follows a small hand-written curiosity
rule. Learning is real numerical adaptation; the appearance is a visualization.

## Run and inspect

Serve the repository with `python -m http.server 8000` and open `http://localhost:8000`.
The pond also works by opening `index.html`; microphone permission needs a secure origin
(HTTPS or localhost). The application has no package dependencies or build step.

```sh
node --test tests/core.test.cjs
node tests/measure.cjs
```

The browser and checks execute the same [numerical engine](web/core.js).
See [MODEL.md](MODEL.md) for the exact equations, information boundary and limitations.
The existing GitHub Pages workflow publishes the repository root.

**[Measured results](RESULTS.md):** seven checks pass. Across six seeds, with the body
stationary and learning frozen, the model explains **99.995–99.999%** of future simulated
returns. Removing the internal copy reduces that score to **0%**. Changing a reflector
breaks the old prediction; relearning restores it. The real-room adapter remains
unvalidated on hardware. [Raw receipt](results/measurement.json).

This is a small predictive organism experiment. It does not demonstrate consciousness,
understanding, biological circuitry or autonomous discovery of a learning algorithm.

MIT licensed.
