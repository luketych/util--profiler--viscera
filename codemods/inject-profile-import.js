const { dirname, relative, resolve } = require('path');
const { fileURLToPath } = require('url');

// Get the directory of the current module (the codemod file)
// CommonJS doesn't have import.meta.url, use __filename instead
// const __filename = fileURLToPath(import.meta.url);
const __dirname_codemod = __dirname; // Node provides __dirname in CJS

/**
 * @param {import('jscodeshift').FileInfo} fileInfo
 * @param {import('jscodeshift').API} api
 */
module.exports = function transformer(fileInfo, api) { // Use module.exports
	const j = api.jscodeshift;
	const root = j(fileInfo.source);

	const profileImportIdentifier = 'profileImport'; // Consistent identifier name
	const markerString = '__AUTO_PROFILE__'; // Structural marker

	// --- Calculate relative path dynamically ---
	// Absolute path to profileImport.js source file
    const profileImportAbsolutePath = resolve(__dirname_codemod, '../src/profileImport.js');
    // Directory of the target file being transformed
    const targetFileDir = dirname(fileInfo.path);
    // Calculate the relative path FROM the target file's directory TO profileImport.js
    let relativePathToProfileImport = relative(targetFileDir, profileImportAbsolutePath);
    // Normalize path for import statements (e.g., ensure it starts with ./ or ../)
    if (!relativePathToProfileImport.startsWith('.')) {
         relativePathToProfileImport = './' + relativePathToProfileImport;
    }
	// console.log(`Calculated relative path to profileImport: ${relativePathToProfileImport}`);

	// --- 1. Find or add the profileImport import declaration using calculated path ---
	let importDeclaration = root.find(j.ImportDeclaration, {
		source: {
			type: 'Literal',
			// Check if the existing import source resolves to the same absolute path
			value: existingPath => resolve(targetFileDir, existingPath) === profileImportAbsolutePath
		}
	});

	let isImportAdded = false;
	if (importDeclaration.length === 0) {
		// console.log(`Adding import for ${profileImportIdentifier} from ${relativePathToProfileImport}`);
		importDeclaration = j.importDeclaration(
			[j.importDefaultSpecifier(j.identifier(profileImportIdentifier))],
			j.literal(relativePathToProfileImport) // Use calculated relative path
		);
		// Insert the new import declaration at the beginning of the file body
		const firstNodePath = root.find(j.Program).get('body', 0);
		if (firstNodePath) {
			firstNodePath.insertBefore(importDeclaration);
		} else {
			// Fallback if the body is empty (e.g., empty file)
			root.get().node.body.push(importDeclaration);
		}
 		isImportAdded = true;
 	} else {
 		// console.log(`Found existing import for ${profileImportIdentifier}`);
	}

	// --- 2. Find and transform dynamic imports, adding the marker argument ---
    let changed = false;

    root.find(j.ImportExpression)
        .forEach(importPath => {
            // console.log(`Found import: ${j(importPath).toSource()}`);

            // Determine node to replace (the import or the await expression containing it)
            let nodeToReplace = importPath;
            if (importPath.parentPath.node.type === 'AwaitExpression') {
                nodeToReplace = importPath.parentPath;
            }

            // Check for already wrapped import (basic check)
            if (nodeToReplace.parentPath?.value?.callee?.name === profileImportIdentifier) {
                // console.log('     Skipping already wrapped import.');
                return;
            }

            // Check if source is a Literal (dynamic imports require string literals)
            if (importPath.value.source && importPath.value.source.type === 'Literal') {
                const modulePathArg = importPath.value.source;

				// Create 'import.meta.url'
                const importMetaUrl = j.memberExpression(
                    j.metaProperty(j.identifier('import'), j.identifier('meta')),
                    j.identifier('url')
                );

				// Create the marker argument
				const markerArg = j.literal(markerString);

                // Create profileImport(modulePath, import.meta.url, null, marker)
				// Passing null for the _importer argument as it's for testing
                const wrappedCall = j.callExpression(
                    j.identifier(profileImportIdentifier),
                    [modulePathArg, importMetaUrl, j.literal(null), markerArg]
                );

                // Wrap in await if the original import was awaited
                let replacementNode = (nodeToReplace === importPath) ? wrappedCall : j.awaitExpression(wrappedCall);
                // console.log(`     Replacing with: ${j(replacementNode).toSource()}`);

                j(nodeToReplace).replaceWith(replacementNode);
                changed = true;
            } else {
                 const sourceType = importPath.value.source ? importPath.value.source.type : 'undefined';
                 console.warn(`     Skipping dynamic import: Source is not a Literal (type: ${sourceType}). Source: ${j(importPath).toSource()}`);
            }
        });

	// --- 3. Return modified source only if changes were made or import added ---
	return (changed || isImportAdded) ? root.toSource({ quote: 'single' }) : fileInfo.source; // Use single quotes for consistency
}
