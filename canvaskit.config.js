module.exports = {
  features: {
    pdf: true,
    skp: true,
    particles: false,
    runtime: false,
    pathops: true,
    canvas2d: false,
  },
  formats: ['wasm'],
  targets: ['wasm'],
  output: './public/canvaskit',
};
