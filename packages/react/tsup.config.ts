import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    line: 'src/charts/LineChart.tsx',
    area: 'src/charts/AreaChart.tsx',
    bar: 'src/charts/BarChart.tsx',
    'win-loss': 'src/charts/WinLossChart.tsx',
    bullet: 'src/charts/BulletChart.tsx',
    donut: 'src/charts/DonutChart.tsx',
    scatter: 'src/charts/ScatterChart.tsx',
    heatmap: 'src/charts/HeatmapChart.tsx',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom'],
  outDir: 'dist',
  // Every entry in this package is a client component, so the 'use client'
  // directive is hoisted here rather than relying on the per-file directives:
  // bundlers drop module-level directives when merging modules. tsup's
  // `treeshake` option is deliberately NOT enabled here — it runs a Rollup
  // pass over the output that strips this banner. Consumer tree-shaking is
  // unaffected: it comes from "sideEffects": false plus the per-chart ESM
  // subpath entries.
  banner: { js: '"use client";' },
});
