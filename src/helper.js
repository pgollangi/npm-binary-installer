const decompress = require('decompress')
const path = require('path')
const os = require('os')
const uniqueFilename = require('unique-filename')

const OMIT_PRESET = ['LICENSE', 'README.md']

class Matcher {
  /**
     *
     * @param {string[]} matchers
     */
  constructor (matchers) {
    this.matchers = matchers
  }

  /**
     *
     * @param {string} name
     */
  match (name) {
    name = name.toLowerCase()
    return this.matchers.find(m => name.indexOf(m) !== -1)
  }
}

const PLATFORMS = {
  win32: new Matcher(['windows']),
  linux: new Matcher(['linux']),
  darwin: new Matcher(['darwin', 'macos'])
}

const ARCHS = {
  x32: new Matcher(['i386', '386']),
  x64: new Matcher(['x86_64', 'amd64'])
}

class BinaryMatcher {
  /**
     *
     * @param {string} platform
     * @param {string} arch
     */
  constructor (platform, arch) {
    this.platform = platform
    this.arch = arch
  }

  /**
     *
     * @param {string} name
     */
  match (name) {
    const p = PLATFORMS[this.platform]
    if (!p) {
      throw new Error('Unsupported platform ' + this.platform)
    }
    if (!p.match(name)) {
      return false
    }
    const a = ARCHS[this.arch]
    if (!a) {
      throw new Error('Unsupported OS architecture ' + this.arch)
    }
    return a.match(name)
  }
}

function findBinary (binaries, namer, platform, arch) {
  if (!platform) {
    platform = process.platform
  }
  if (!arch) {
    arch = process.arch
  }
  const matcher = new BinaryMatcher(platform, arch)
  const found = binaries.find(b => matcher.match(namer(b)))
  if (!found) {
    throw new Error(`Could not find suitable binary the current platform.
      Please report an issue at github.com/pgollang/nscoop if you think this must be supported.`)
  }
  return found
}

/**
   *
   * Extracts the archive and look for binary inside it and returns the path to it
   *
   * @param {string} archivePath
   * @param {string} outDir
   */
function getBinaryFromArchive (archivePath, outDir) {
  if (!outDir) {
    outDir = uniqueFilename(os.tmpdir())
  }
  return decompress(archivePath, outDir, {
    filter: file => {
      const ext = path.extname(file.path)
      const filename = path.basename(file.path).toLocaleLowerCase()
      return (ext === '.exe' || ext === '') &&
       OMIT_PRESET.findIndex(o => o.toLocaleLowerCase() === filename) === -1
    }
  }).then(files => {
    if (files.length === 0) {
      throw new Error(`Could not find binary in archive "${archivePath}"`)
    }
    return path.resolve(outDir, files[0].path)
  })
}

exports.findBinary = findBinary
exports.getBinaryFromArchive = getBinaryFromArchive
