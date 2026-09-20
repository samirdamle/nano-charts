---
'@samirdamle/nano-charts': minor
---

Add a `track` option to `bar()`: an opt-in background bar behind each column spanning the full value domain (the "100%" reference, e.g. a light grey full bar behind a progress-style bar). `track: true` enables it with defaults; `track: { max, color, opacity, radius }` tunes it — `max` extends the value domain when larger than the data max, `color`/`opacity` style the track (default: base color at 15% opacity), and `radius` defaults to the bar's own `radius` so rounded caps match. Works for single, stacked, and horizontal bars; tracks are decorative and emit no points.
