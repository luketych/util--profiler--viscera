# Viscera Profiler

A utility library for profiling the time taken by dynamic `import()` calls in Node.js applications.

## Installation

```bash
# If published to npm:
npm install viscera-profiler

# For local development/linking:
cd /path/to/viscera
npm link
cd /path/to/your-project
npm link viscera-profiler
```

## Usage

Wrap your dynamic imports with the `profileImport` function provided by this library.

```javascript
// Import the profiler
import profileImport from 'viscera-profiler'; // Use package name after linking/installing

async function loadMyModule() {
  // Original:
  // const myModule = await import('./myModule.js');

  // Profiled:
  // The second argument MUST be import.meta.url from the CALLING file.
  const myModule = await profileImport('./myModule.js', import.meta.url);

  myModule.doStuff();
}
```

### Viewing Output

Enable the debug output by setting the `DEBUG` environment variable:

```bash
DEBUG='app:profiler:*' node your_app.js
```

This will print timing information for each profiled import and a cumulative total upon process exit.

### Codemods

This package also includes codemods (in the `codemods/` directory) to automatically inject and remove the `profileImport` wrapper using `jscodeshift`.

**Inject:**

```bash
npx jscodeshift -t ./node_modules/viscera-profiler/codemods/inject-profile-import.js your_target_file.js
```

**Remove:**

```bash
npx jscodeshift -t ./node_modules/viscera-profiler/codemods/remove-profile-import.js your_target_file.js
```
