import fs from 'fs'
import path from 'path'
import fastGlob from 'fast-glob'

import findWorkspaceRoot from './findWorkspaceRoot.js'

export default async function getWorkspaceURIs(workspaceRootPath) {
    const rootPath = await findWorkspaceRoot(workspaceRootPath)
    const file = path.join(rootPath, 'package.json')
    const pkgJson = JSON.parse(await fs.promises.readFile(file, 'utf8'))

    const workspaceGlobs = pkgJson.workspaces
    const workspaceURIs = []

    for (const pattern of workspaceGlobs) {
        // Convert glob pattern to absolute path pattern
        const absolutePattern = path.join(rootPath, pattern, 'package.json')
        
        // Find all package.json files matching the workspace glob pattern
        const matches = await fastGlob(absolutePattern)

        // Add the parent directory of each package.json to workspaceURIs
        matches.forEach(packageJsonPath => {
            workspaceURIs.push(path.dirname(packageJsonPath))
        })
    }

    return workspaceURIs
}