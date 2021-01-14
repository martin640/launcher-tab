const fs = require('fs')
const fse = require('fs-extra')
const paths = {
    "origin": "../src",
    "target": "../build"
}

console.log("Clearing existing build folder...")
fs.rmdirSync(paths.target, { recursive: true })
console.log("Recreating build folder...")
fs.mkdirSync(paths.target)
console.log("Copying src folder to build...")
fse.copySync(paths.origin, paths.target)
