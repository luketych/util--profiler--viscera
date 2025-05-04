const { dirname, relative, resolve } = require('path');

/**
 * @param {import('jscodeshift').FileInfo} fileInfo
 * @param {import('jscodeshift').API} api
 */
module.exports = function transformer(fileInfo, api) {
    const j = api.jscodeshift;
    const root = j(fileInfo.source);

    const profileImportIdentifier = 'profileImport'; // Identifier to look for
    const markerString = '__AUTO_PROFILE__'; // Marker to verify
    let changed = false;

    // --- 1. Find and unwrap marked profileImport calls ---
    root.find(j.CallExpression, {
            callee: { name: profileImportIdentifier }
        })
        .forEach(callPath => {
            // Check if the 4th argument is the marker string
            const args = callPath.value.arguments;
            if (args.length >= 4 && 
                args[3].type === 'Literal' && 
                args[3].value === markerString) {
                
                // Found a marked call
                // console.log(`Found marked profileImport call: ${j(callPath).toSource()}`);

                // The original dynamic import expression is the first argument
                const originalImportArg = args[0];

                // Determine the node to replace (the call expression or its parent await expression)
                let nodeToReplace = callPath;
                let replacementNode = j.importExpression(originalImportArg); // Base: import(originalArg)

                if (callPath.parentPath.node.type === 'AwaitExpression') {
                    // console.log('   Parent is AwaitExpression');
                    nodeToReplace = callPath.parentPath;
                    replacementNode = j.awaitExpression(replacementNode); // Wrap: await import(originalArg)
                }
                
                // console.log(`   Replacing with: ${j(replacementNode).toSource()}`);
                j(nodeToReplace).replaceWith(replacementNode);
                changed = true;
            }
        });

    // --- 2. Remove the profileImport import declaration if it's now unused ---
    if (changed) {
        // Find the import declaration again
        const profileImportAbsolutePath = resolve(__dirname, '../src/profileImport.js');
        const targetFileDir = dirname(fileInfo.path);
        
        root.find(j.ImportDeclaration, {
            source: {
                type: 'Literal',
                value: existingPath => resolve(targetFileDir, existingPath) === profileImportAbsolutePath
            }
        }).forEach(importDeclPath => {
            // Check if the default specifier (profileImport) is actually used anywhere else
            const specifiers = importDeclPath.value.specifiers;
            if (specifiers && specifiers.length === 1 && specifiers[0].type === 'ImportDefaultSpecifier') {
                const importName = specifiers[0].local.name;
                // Count remaining usages of this specific import name
                const usages = root.find(j.Identifier, { name: importName })
                                  // Exclude the import declaration itself from the usage count
                                  .filter(idPath => idPath.parentPath !== importDeclPath && idPath.parentPath.value !== specifiers[0]) 
                                  .length;
                
                // console.log(`Usages found for ${importName}: ${usages}`);
                if (usages === 0) {
                    // console.log(`Removing unused import declaration for ${importName}`);
                    j(importDeclPath).remove();
                    // No need to set 'changed = true' again, we only remove if other changes were made
                }
            }
        });
    }

    // --- 3. Return modified source only if changes were made ---
    return changed ? root.toSource({ quote: 'single' }) : fileInfo.source;
};
