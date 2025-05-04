import { jest, describe, beforeEach, test, expect, afterEach } from '@jest/globals';

// Mock the debug module using unstable_mockModule
const mockDebugLog = jest.fn();
jest.unstable_mockModule('debug', () => ({
    __esModule: true,
    default: jest.fn((namespace) => {
        if (namespace === 'app:profiler:imports') {
            return mockDebugLog;
        }
        // You might need to provide a default mock behavior or import the original
        // For now, let's just return a dummy function for other namespaces
        return jest.fn(); 
    }),
}));

describe('ImportProfiler', () => {
  const MOCK_CALLER_FILE = '/path/to/caller.js';
  const MOCK_RELATIVE_PATH = 'src/caller.js';
  let profiler;
  let ImportProfiler; // Declare variable to hold the class

  beforeEach(async () => { // Make beforeEach async
    // Reset the mock before each test
    mockDebugLog.mockClear();
    jest.clearAllMocks();
    
    // Dynamically import the class *after* mocks are set up
    // Revert to standard dynamic import for test setup
    const module = await import('../src/ImportProfiler.js');
    ImportProfiler = module.default; 
 
    // Create a new profiler instance
    profiler = new ImportProfiler(MOCK_CALLER_FILE, MOCK_RELATIVE_PATH);
  });

  test('constructor initializes properties correctly', () => {
    expect(profiler.callerFile).toBe(MOCK_CALLER_FILE);
    expect(profiler.relativePathFromCallerPackage).toBe(MOCK_RELATIVE_PATH);
    expect(profiler.imports).toBeInstanceOf(Map);
    expect(profiler.imports.size).toBe(0);
    expect(profiler.startTime).toBeDefined();
    expect(profiler.lastImport).toBeNull();
    expect(profiler.lastTotalTime).toBe(0);
  });

  test('trackImport updates lastImport correctly', () => {
    const moduleName = './myModule.js';
    const importTime = 123.45;

    profiler.trackImport(moduleName, importTime);

    expect(profiler.imports.size).toBe(1);
    expect(profiler.imports.get(moduleName)).toBe(importTime);
    expect(profiler.lastImport).toEqual({ moduleName, importTime });
  });

  test('summarize logs the last import time using debug (below 1s)', () => {
    const moduleName = './anotherModule.js';
    const importTime = 50.678;

    profiler.trackImport(moduleName, importTime);
    profiler.summarize();

    expect(mockDebugLog).toHaveBeenCalledTimes(1);
    expect(mockDebugLog).toHaveBeenCalledWith(`[${moduleName}] (importTime: ${importTime.toFixed(2)}ms)`);
  });

  test('summarize logs the last import time using debug (above 1s, colored)', () => {
    const moduleName = './slowModule.js';
    const importTime = 1500.123;

    profiler.trackImport(moduleName, importTime);
    profiler.summarize();

    // Expected string with ANSI color codes for red text
    const expectedLogString = `[${moduleName}] (importTime: \x1b[31m${importTime.toFixed(2)}\x1b[0mms)`;

    expect(mockDebugLog).toHaveBeenCalledTimes(1);
    expect(mockDebugLog).toHaveBeenCalledWith(expectedLogString);
  });

   test('summarize does not log if no import was tracked', () => {
    profiler.summarize();
    expect(mockDebugLog).not.toHaveBeenCalled();
  });

  test('constructor initializes lastTotalTime correctly', () => {
    expect(profiler.lastTotalTime).toBe(0);
  });
});
