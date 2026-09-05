import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    line: 'src/charts/line.ts',
    area: 'src/charts/area.ts',
    bar: 'src/charts/bar.ts',
    'win-loss': 'src/charts/win-loss.ts',
    bullet: 'src/charts/bullet.ts',
    donut: 'src/charts/donut.ts',
    scatter: 'src/charts/scatter.ts',
    heatmap: 'src/charts/heatmap.ts',
    'to-svg': 'src/render/to-svg.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  treeshake: true,
  outDir: 'dist',
});
