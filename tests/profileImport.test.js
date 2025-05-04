import { jest, describe, beforeAll, beforeEach, test, expect } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// --- Mocks ---

// Mock utility functions
const mockGetPackageName = jest.fn().mockResolvedValue('test-package');
const mockGetWorkspaceURIs = jest.fn();
jest.unstable_mockModule('../src/getPackageName.js', () => ({ default: mockGetPackageName }));
jest.unstable_mockModule('../src/getWorkspaceURIs.js', () => ({ default: mockGetWorkspaceURIs }));

// Mock ImportProfiler class using unstable_mockModule
const mockTrackImport = jest.fn();
const mockSummarize = jest.fn();
const mockImportProfiler = jest.fn().mockImplementation(() => ({
    trackImport: mockTrackImport,
    summarize: mockSummarize,
}));
jest.unstable_mockModule('../src/ImportProfiler.js', () => ({
    __esModule: true,
    default: mockImportProfiler, // Use the mock constructor
}));

// Define the mock modules we expect to be imported
const mockRelativeModule = { default: { data: 'mock data' } };
const mockNonRelativeModule = { value: 123 };
const mockWorkspaceModule = { default: { id: 'workspace-pkg' } };

// --- Setup ---

let profileImport;
const MOCK_IMPORT_META_URL = 'file:///path/to/caller/file.js';

// Create a mock importer function
const mockImporter = jest.fn(async (modulePath) => {
    console.log(`Mock importer called with: ${modulePath}`); // Debug log
    if (modulePath === '/path/to/caller/module.js') {
        return Promise.resolve(mockRelativeModule);
    }
    if (modulePath === 'another.js') {
        return Promise.resolve(mockNonRelativeModule);
    }
    if (modulePath === '/path/to/workspace/pkg') {
        return Promise.resolve(mockWorkspaceModule);
    }
    // If no match, throw a simulated 'module not found' error
    throw new Error(`Cannot find module '${modulePath}' (mocked importer)`);
});

beforeAll(async () => {
    // Dynamically import profileImport after all mocks are defined
    const module = await import('../src/profileImport.js'); // Revert to simple import for test setup
    profileImport = module.default;
});

describe('profileImport', () => {

    beforeEach(() => {
        // Reset mocks before each test
        mockGetPackageName.mockClear().mockResolvedValue('test-package');
        mockGetWorkspaceURIs.mockClear().mockResolvedValue(['/path/to/workspace/pkg']);
        mockTrackImport.mockClear();
        mockSummarize.mockClear();
        mockImportProfiler.mockClear(); 
        // Clear the mock importer calls
        mockImporter.mockClear();
    });

    test('should throw error if import.meta.url is missing', async () => {
        // Pass the mock importer
        await expect(profileImport('./module.js', null, mockImporter)).rejects.toThrow(
            'importMetaUrl is required for relative module paths'
        );
    });

    test('should import a relative module path correctly', async () => {
        const modulePath = './module.js';
        const expectedResolvedPath = '/path/to/caller/module.js'; 

        // Pass the mock importer
        const result = await profileImport(modulePath, MOCK_IMPORT_META_URL, mockImporter);

        // Check mocks
        expect(mockGetPackageName).toHaveBeenCalledWith({ dirname: MOCK_IMPORT_META_URL });
        expect(mockImporter).toHaveBeenCalledWith(expectedResolvedPath); // Check mock importer call
        expect(jest.mocked(mockImportProfiler)).toHaveBeenCalledTimes(1);
        expect(mockTrackImport).toHaveBeenCalledTimes(1);
        expect(mockSummarize).toHaveBeenCalledTimes(1);

        // Check the name passed to trackImport
        expect(mockTrackImport).toHaveBeenCalledWith(modulePath, expect.any(Number));

        // Check result
        expect(result).toEqual(mockRelativeModule.default); // Expect the default export
    });

    test('should import a non-relative module path correctly', async () => {
        const modulePath = 'another.js'; 
        
        // Pass the mock importer
        const result = await profileImport(modulePath, MOCK_IMPORT_META_URL, mockImporter);

        expect(mockGetPackageName).toHaveBeenCalledWith({ dirname: MOCK_IMPORT_META_URL });
        expect(mockImporter).toHaveBeenCalledWith(modulePath); // Non-relative path passed directly
        expect(jest.mocked(mockImportProfiler)).toHaveBeenCalledTimes(1);
        expect(mockTrackImport).toHaveBeenCalledWith(modulePath, expect.any(Number));
        expect(mockSummarize).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockNonRelativeModule); 
    });

    test('should handle @ktr-srt/ workspace paths', async () => {
        // Set up mocks specific to this test
        // The default mock for findWorkspaceRoot should be active now.
        // We might only need to adjust getWorkspaceURIs if the default isn't right for this test.
        mockGetWorkspaceURIs.mockResolvedValue(['/path/to/workspace/pkg', '/path/to/workspace/other']);

        const modulePath = '@ktr-srt/pkg';
        const expectedResolvedPath = '/path/to/workspace/pkg'; // Path resolved by profileImport

        // Pass the mock importer
        const result = await profileImport(modulePath, MOCK_IMPORT_META_URL, mockImporter);

        expect(mockGetPackageName).toHaveBeenCalledWith({ dirname: MOCK_IMPORT_META_URL });
        expect(mockGetWorkspaceURIs).toHaveBeenCalledWith(dirname(fileURLToPath(MOCK_IMPORT_META_URL))); 
        expect(mockImporter).toHaveBeenCalledWith(expectedResolvedPath); // Check mock importer call
        expect(jest.mocked(mockImportProfiler)).toHaveBeenCalledTimes(1);
        // Note: The dynamic import mock needs to map the final resolved path
        expect(mockTrackImport).toHaveBeenCalledWith(modulePath, expect.any(Number)); 
        expect(mockSummarize).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockWorkspaceModule.default); // Expect the default export
    });

    test('should throw error if workspace URI is not found for @ktr-srt/', async () => {
        // Set up mocks specific to this test
        mockGetWorkspaceURIs.mockResolvedValue(['/path/to/workspace/another']); // Return URIs that don't match

        const modulePath = '@ktr-srt/not-found-pkg';

        // Pass the mock importer (it won't be called as error happens before)
        await expect(profileImport(modulePath, MOCK_IMPORT_META_URL, mockImporter)).rejects.toThrow(
            `Could not find workspaceURI for ${modulePath}`
        );
        expect(mockGetWorkspaceURIs).toHaveBeenCalledWith(dirname(fileURLToPath(MOCK_IMPORT_META_URL))); 
    });
});
