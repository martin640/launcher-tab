const fs = require('fs')
const fse = require('fs-extra')
const resolve = require('path').resolve
const exec = require('child_process').exec
const archiver = require('archiver')
const log = (o) => process.stdout.write(o)

const paths = {
    "origin": "../src",
    "target": "../build",
    "target_babel": "../build/launcher-tab.min",
    "chrome": "C:\\Program Files (x86)\\Google\\Chrome\\Application\\Chrome.exe"
}

const execStart = Date.now()
step1()

function step1() {
    log(" ┠─┬─ Step 1: Prepare build folders\n")
    log(" ┃ ├─── Clearing existing build folder...")
    fs.rmdirSync(paths.target, {recursive: true})
    log(" [OK]\n")
    log(" ┃ ├─── Recreating build folder...")
    fs.mkdirSync(paths.target)
    log(" [OK]\n")
    log(" ┃ └─── Copying src folder to the build folder...")
    fse.mkdirsSync(paths.target_babel)
    fse.copySync(paths.origin, paths.target_babel)
    log(" [OK]\n")

    step2()
}

function step2() {
    log(" ┃\n")
    log(" ┠─┬─ Step 2: Compile Javascript\n")
    log(" ┃ └─── Run Babel...")
    exec(`npx babel ${paths.origin} --out-dir ${paths.target_babel} --no-comments`,
        (err, stdout, stderr) => {
            if (err) {
                log("\n")
                console.log(" ╹      Failed to compile source code using babel. Dumping output...\n")
                console.log(stdout)
                console.log(stderr)
            } else {
                const p = resolve(paths.target_babel)
                log(" [OK]\n")
                log(` ┃      · path: ${p}\n`)
                step3()
            }
        })
}

function step3() {
    log(" ┃\n")
    log(" ┠─┬─ Step 3: Pack output\n")
    log(" ┃ ├─── Generating crx...")

    const keyA = resolve('./key.pem')
    const buildA = resolve(paths.target_babel)
    exec(`"${paths.chrome}" --pack-extension="${buildA}" --pack-extension-key="${keyA}"`,
        (err) => {
            if (!err) {
                log(" [OK]\n")
                const crxPath = resolve(paths.target_babel + '/../launcher-tab.min.crx')
                const stats = fs.statSync(crxPath)
                const fileSizeInBytes = stats.size
                const fileSizeInMegabytes = Math.round(fileSizeInBytes / (1024*1024) * 100) / 100

                log(` ┃ │    · path: ${crxPath}\n`)
                log(` ┃ │    · size: ${fileSizeInMegabytes} MB\n`)
            } else {
                log(" [Command call returned error, skipping]\n")
            }
            step3_2()
        })
}

function step3_2() {
    log(" ┃ └─── Generating zip...")
    const zipPath = resolve(paths.target + '/launcher-tab.min.zip')

    const output = fs.createWriteStream(zipPath)
    const archive = archiver('zip', {
        zlib: { level: 9 }
    })
    output.on('close', () => {
        const fileSize = archive.pointer()
        const fileSizeInMegabytes = Math.round(fileSize / (1024*1024) * 100) / 100

        log(" [OK]\n")
        log(` ┃      · path: ${zipPath}\n`)
        log(` ┃      · size: ${fileSizeInMegabytes} MB\n`)
        step4()
    })

    output.on('end', () => console.log('      Data has been drained'))

    archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
            // log warning
        } else {
            throw err;
        }
    });

    archive.on('error', err => { throw err })
    archive.pipe(output)
    archive.directory(paths.target_babel, 'launcher-tab')
    archive.finalize()
}

function step4() {
    log(" ┃\n")
    log(" ┠─── Step 4: Clean up [Nothing to do]\n\n\n")
    const execTime = Date.now() - execStart
    log(`Project build has finished in ${Math.round(execTime * 100) / 100} ms\n`)
}
