const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { createLLMSText } = require('../lib/createLLMSText')

async function run() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-llms-text-'))
  const sourceDir = path.join(tempDir, 'docs')
  const outDir = path.join(tempDir, 'dist')

  try {
    fs.mkdirSync(sourceDir, { recursive: true })
    fs.writeFileSync(path.join(sourceDir, 'README.md'), '# Home\n')

    const plugin = createLLMSText({}, {
      sourceDir,
      outDir,
      isProd: true,
      themeConfig: {
        sidebar: {
          '/': [{ title: 'Home', path: '/' }],
        },
      },
      siteConfig: {
        title: 'Test docs',
        description: 'Test description',
      },
    })

    assert.strictEqual(typeof plugin, 'object')
    assert.strictEqual(typeof plugin.then, 'undefined')
    assert.strictEqual(typeof plugin.ready, 'function')

    await plugin.ready()

    const output = fs.readFileSync(path.join(outDir, 'llms.txt'), 'utf-8')
    assert.ok(output.includes('Test docs'))
    assert.ok(output.includes('[Home](/README.md)'))
    console.log('ok - returns a plugin object and generates llms.txt during ready')
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

run().catch(error => {
  console.error('not ok - createLLMSText plugin lifecycle')
  console.error(error.stack)
  process.exitCode = 1
})
