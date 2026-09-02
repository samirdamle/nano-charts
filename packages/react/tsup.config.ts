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
  treeshake: true,
  external: ['react', 'react-dom'],
  outDir: 'dist',
});
