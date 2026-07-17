const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const MarkdownIt = require('markdown-it')
const { normalizeLink } = require('../lib/markdown/normalizeLink')

function createMarkdown(options = {}) {
  const md = new MarkdownIt()
  normalizeLink(md, options)
  return md
}

function hrefs(html) {
  return Array.from(html.matchAll(/href="([^"]+)"/g), match => match[1])
}

async function run() {
  const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'normalize-link-'))
  fs.mkdirSync(path.join(sourceDir, 'api'))

  try {
    const md = createMarkdown({ sourceDir })
    assert.strictEqual(md.normalizeLink('api/foo.md'), '/api/foo.html')
    assert.strictEqual(md.normalizeLink('/guide/README.md#intro'), '/guide/index.html#intro')
    assert.strictEqual(md.normalizeLink('/guide/INDEX'), '/guide/index.html')
    assert.strictEqual(md.normalizeLink('/guide/page.md?x=1'), '/guide/page.html?x=1')
    assert.strictEqual(md.normalizeLink('/guide/page.md.backup'), '/guide/page.md.backup')
    assert.strictEqual(md.normalizeLink('/guide/myindex-page'), '/guide/myindex-page')
    assert.strictEqual(md.normalizeLink('/guide.md?id=section'), '/guide.html#section')
    assert.strictEqual(md.normalizeLink('https://example.com/README.md'), 'https://example.com/README.md')
    assert.strictEqual(md.normalizeLink('//cdn.example.com/file.md'), '//cdn.example.com/file.md')

    const basedMd = createMarkdown({ base: '/uni-app-x/', sourceDir })
    const html = basedMd.render([
      '[extensionless](/guide/page)',
      '[markdown](/guide/page.md)',
      '[directory](/guide/)',
      '[based](/uni-app-x/guide/page)',
      '[relative](guide/page.md)',
      '[external](//cdn.example.com/file.md)',
      '[reference][ref]',
      '',
      '[ref]: /reference/page',
    ].join('\n\n'))

    assert.deepStrictEqual(hrefs(html), [
      '/uni-app-x/guide/page',
      '/guide/page.html',
      '/guide/',
      '/uni-app-x/guide/page',
      './guide/page.html',
      '//cdn.example.com/file.md',
      '/uni-app-x/reference/page',
    ])
    console.log('ok - normalizes Markdown links without corrupting URL suffixes')
  } finally {
    fs.rmSync(sourceDir, { recursive: true, force: true })
  }
}

run().catch(error => {
  console.error('not ok - normalizeLink')
  console.error(error.stack)
  process.exitCode = 1
})
