// jest.config.js
/** @type {import('jest').Config} */
const config = {
  // Optional: If dependencies also use ESM and aren't transformed by default,
  // you might need to adjust transformIgnorePatterns.
  // For now, let's keep it simple.
  // transformIgnorePatterns: [
  //   '/node_modules/(?!your-esm-dependency).+\.js$'
  // ],

  // We shouldn't need a transformer for standard ESM .js files
  transform: {},
  
  // Jest's ESM support can be tricky with mocks. Setting moduleFileExtensions
  // explicitly might help in some cases, though defaults are usually okay.
  moduleFileExtensions: ['js', 'json', 'node'],
  
  // Verbose output can sometimes help diagnose issues
  verbose: true,
};

export default config;
