import fs from 'fs'
import path from 'path'


/**
 * Returns the package.json file as an object. If it's not found, it will recursively search up the directory tree until it finds it.
 * Or it will return an empty object.
 * @param {*} dir 
 * @returns 
 */
export default async function getPackageJSONasObj(dir) {
    if (!dir) { 
      dir = process.cwd()
      console.log(`getPackageJSONasObj(): No directory specified. Using current working directory: ${dir}`)
    }
    if (dir === '/') throw new Error('Could not find package.json')

    let packageJSONpath

    if (dir.split('/').at(-1).includes('package.json')) packageJSONpath = dir
    else packageJSONpath = path.join(dir, 'package.json')

    try {
        const data = await fs.promises.readFile(packageJSONpath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        // console.error('Failed to read or parse package.json:', err);
        // throw err;
        return await getPackageJSONasObj(path.join(dir, '..'))
    }
}