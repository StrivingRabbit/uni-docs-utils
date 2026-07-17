import MarkdownIt from "markdown-it"
import Renderer from "markdown-it/lib/renderer"
import Token from "markdown-it/lib/token"

function addLoadingAttr(attribs: Record<string, any>) {
  if (matchSrc(attribs.src) && !attribs.loading) {
    attribs.loading = 'lazy'
  }
}

/**
 *
 * @param {string} [src] img src
 * @returns
 */
function matchSrc(src: string) {
  return typeof src === 'string' && ['qiniu-web-assets.dcloud.net.cn', 'web-ext-storage.dcloud.net.cn'].some((item) => src.includes(item))
}

function replaceNodes(nodes: any[]) {
  if (!nodes) return
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (node.name === 'img' && node.attribs && node.attribs.src) {
      addLoadingAttr(node.attribs)
    }
    replaceNodes(node.children)
  }
}

function replaceHTML(token: Token) {
  const htmlparser = require('htmlparser2')
  const serializer = require('dom-serializer')
  const dom = new htmlparser.parseDocument(token.content, {
    lowerCaseTags: false,
    xmlMode: true,
    decodeEntities: false,
  })
  /**
   * 会将 <a/> 标签解析成 <a></a>
   * 会将 <style></style> 标签解析
   */
  if (!dom.firstChild || ['a', 'style'].includes(dom.firstChild.name)) return
  replaceNodes(dom.children)
  token.content = serializer.render(dom, { encodeEntities: false, xmlMode: 'foreign' })
}

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

function resolveInlineTag(token: Token) {
  const content = token.content.trim()
  const closeTag = content.match(/^<\/([A-Za-z][\w:.-]*)\s*>$/)
  if (closeTag) {
    return { name: closeTag[1], close: true, selfClosing: false }
  }

  const openTag = content.match(/^<([A-Za-z][\w:.-]*)\b/)
  if (openTag) {
    return {
      name: openTag[1],
      close: false,
      selfClosing: /\/\s*>$/.test(content) || VOID_TAGS.has(openTag[1].toLowerCase()),
    }
  }
}

function replaceInlineHTML(tokens: Token[]) {
  const tags = tokens.map(token => token.type === 'html_inline' ? resolveInlineTag(token) : undefined)
  const openTags: Array<{ name: string; index: number }> = []
  const pairedTagIndexes = new Set<number>()

  tags.forEach((tag, index) => {
    if (!tag || tag.selfClosing) return
    if (!tag.close) {
      openTags.push({ name: tag.name, index })
      return
    }

    const openTag = openTags[openTags.length - 1]
    if (openTag && openTag.name === tag.name) {
      pairedTagIndexes.add(openTag.index)
      pairedTagIndexes.add(index)
      openTags.pop()
    }
  })

  tokens.forEach((token, index) => {
    const tag = tags[index]
    if (!tag || pairedTagIndexes.has(index)) return
    if (tag.name.toLowerCase() === 'img') {
      replaceHTML(token)
    } else if (tag.close) {
      token.content = ''
    } else if (!tag.selfClosing) {
      token.content += `</${tag.name}>`
    }
  })
}

export function enhanceMd(md: MarkdownIt, opts: MarkdownIt.Options) {
  const oldRendererImageRule = md.renderer.rules.image
  md.renderer.rules.image = function (tokens, idx, ...args) {
    const token = tokens[idx]
    const url = token.attrGet('src')
    if (!token.attrGet('loading') && matchSrc(typeof url === 'string' ? url : '')) {
      token.attrPush(['loading', 'lazy'])
    }
    return oldRendererImageRule ? oldRendererImageRule(tokens, idx, ...args) : ''
  } as Renderer.RenderRule | undefined
  // 补全未闭合的 block/inline HTML 标签，并为 Markdown 图片和内联 HTML 图片添加 loading
  md.core.ruler.after('inline', 'enhance-md', function (state) {
    let handleToken: Token | null = null
    for (let i = 0; i < state.tokens.length; i++) {
      const blockToken = state.tokens[i]
      if (blockToken.type === 'html_block') {
        if (handleToken) {
          handleToken.content += blockToken.content
          state.tokens.splice(i, 1)
          i--
        } else {
          handleToken = blockToken
        }
      } else {
        if (handleToken) {
          replaceHTML(handleToken)
          handleToken = null
        }

        if (blockToken.type === 'inline' && blockToken.children) {
          replaceInlineHTML(blockToken.children)
        }
      }
    }
    if (handleToken) {
      replaceHTML(handleToken)
    }
    return false
  })
}
