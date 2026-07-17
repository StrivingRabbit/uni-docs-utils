const assert = require('assert')
const MarkdownIt = require('markdown-it')
const { enhanceMd } = require('../lib/markdown/enhanceMd')

function render(source) {
  const md = new MarkdownIt({ html: true })
  enhanceMd(md, {})
  return md.render(source)
}

function count(content, search) {
  return content.split(search).length - 1
}

const tests = [
  {
    name: 'preserves paired Vue component tags and slot content',
    run() {
      const html = render('### exit 兼容性 <Help label="123">这里的山路十八弯</Help>')
      assert.ok(html.includes('<Help label="123">这里的山路十八弯</Help>'))
    },
  },
  {
    name: 'closes an unmatched inline opening tag',
    run() {
      assert.ok(render('type <T>').includes('<T></T>'))
    },
  },
  {
    name: 'closes a tag whose Vue expression contains a greater-than operator',
    run() {
      const html = render('value <T :value="a > b">')
      assert.ok(html.includes('<T :value="a > b"></T>'))
    },
  },
  {
    name: 'preserves valid nested tags',
    run() {
      const html = render('text <Outer><Inner>value</Inner></Outer>')
      assert.ok(html.includes('<Outer><Inner>value</Inner></Outer>'))
    },
  },
  {
    name: 'repairs crossed tags instead of treating them as paired',
    run() {
      const html = render('text <A><B>value</A></B>')
      assert.ok(html.includes('<A></A><B>value</B>'))
      assert.ok(!html.includes('</A></B>'))
    },
  },
  {
    name: 'removes an unmatched inline closing tag',
    run() {
      assert.strictEqual(render('text </T>'), '<p>text </p>\n')
    },
  },
  {
    name: 'processes consecutive HTML blocks at the end of the document',
    run() {
      const html = render(`<div><img src="https://qiniu-web-assets.dcloud.net.cn/a.png"></div>

<section><img src="https://qiniu-web-assets.dcloud.net.cn/b.png"></section>`)
      assert.strictEqual(count(html, 'loading="lazy"'), 2)
    },
  },
  {
    name: 'adds lazy loading to Markdown and inline HTML images',
    run() {
      const html = render(`![](https://web-ext-storage.dcloud.net.cn/a.png)

text <img src="https://qiniu-web-assets.dcloud.net.cn/b.png">`)
      assert.strictEqual(count(html, 'loading="lazy"'), 2)
    },
  },
]

let failed = 0
tests.forEach(test => {
  try {
    test.run()
    console.log(`ok - ${test.name}`)
  } catch (error) {
    failed++
    console.error(`not ok - ${test.name}`)
    console.error(error.stack)
  }
})

if (failed) {
  process.exitCode = 1
} else {
  console.log(`${tests.length} tests passed`)
}
