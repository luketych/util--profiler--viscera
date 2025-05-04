import fs from 'fs'
import path from 'path'

/**
 * Finds the root workspace directory by walking up directories until finding one with workspaces
 * @param {string} startDir - Directory to start searching from
 * @returns {Promise<string|undefined>} - Path to workspace root directory, or undefined if not found
 */
export default async function findWorkspaceRoot(startDir) {
  if (!startDir || path.extname(startDir)) {
    throw new Error(`Invalid start directory: ${startDir}`)
  }

  let currPath = path.resolve(startDir)
  const rootPath = path.parse(currPath).root

  while (currPath !== rootPath) {
    const pkgJsonPath = path.join(currPath, 'package.json')
    
    try {
      const exists = await fs.promises.access(pkgJsonPath)
        .then(() => true)
        .catch(() => false)

      if (exists) {
        const pkgJson = JSON.parse(
          await fs.promises.readFile(pkgJsonPath, 'utf8')
        )

        if (pkgJson.workspaces) {
          return currPath
        }
      }
    } catch (err) {
      console.error('Error reading package.json:', err)
    }

    currPath = path.resolve(currPath, '..')
  }

  return undefined
}