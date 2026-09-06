# nano-charts

A framework-agnostic library of tiny SVG chart functions (`data → Scene`) plus a React wrapper, meant to be repeated hundreds of times per page (table cells, metric cards).

## Language

**Segment**:
One arc (donut) or one stacked piece of a column (bar) within a *single* chart instance. Segments belong to one dataset and are positioned by index within it.
_Avoid_: Slice, wedge, piece

**Series**:
One entire dataset among several drawn in the *same* chart instance (e.g. one line among several in `lines()`). A series has its own color, its own points, and is not a sub-part of another series.
_Avoid_: Segment, dataset (when "series" is meant)

**Categorical palette**:
An algorithmically generated set of colors (`core/palette.ts`'s `categoricalColor(index, total)`) used to distinguish segments or series when the caller supplies no explicit color. Positional: a pure function of `(index, total)` for the current render, not tied to a segment/series' identity — see [ADR 0002](docs/adr/0002-donut-categorical-palette.md).
_Avoid_: Color scale (that term is reserved for `heatmap`'s continuous 2-color interpolation in `core/color-scale.ts`, a different mechanism)
