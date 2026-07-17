import fs from 'fs'
import path from 'path'
import MarkdownIt from 'markdown-it'

interface NormalizeLinkOptions {
  base?: string
  sourceDir?: string
}

function isExternal(url: string) {
  return /^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//')
}

function getFolderNames(sourceDir: string) {
  try {
    return new Set(
      fs.readdirSync(sourceDir, { withFileTypes: true })
        .filter(item => item.isDirectory())
        .map(item => item.name)
    )
  } catch {
    return new Set<string>()
  }
}

function splitUrl(url: string) {
  const suffixIndex = url.search(/[?#]/)
  if (suffixIndex === -1) {
    return { pathname: url, suffix: '' }
  }
  return {
    pathname: url.slice(0, suffixIndex),
    suffix: url.slice(suffixIndex),
  }
}

function normalizePathname(pathname: string, folderNames: Set<string>) {
  let normalizedPath = pathname.replace(/\\/g, '/')
  const firstSegment = normalizedPath.split('/')[0]
  if (!normalizedPath.startsWith('/') && folderNames.has(firstSegment)) {
    normalizedPath = '/' + normalizedPath
  }

  const slashIndex = normalizedPath.lastIndexOf('/')
  const directory = normalizedPath.slice(0, slashIndex + 1)
  const basename = normalizedPath.slice(slashIndex + 1)

  if (/^(README|index)(\.md)?$/i.test(basename)) {
    return directory + 'index.html'
  }
  if (/\.md$/i.test(basename)) {
    return directory + basename.slice(0, -3) + '.html'
  }
  return normalizedPath
}

function normalizeInternalLink(url: string, folderNames: Set<string>) {
  const parts = splitUrl(url.replace(/\\/g, '/'))
  const suffix = parts.suffix.startsWith('?id=') ? '#' + parts.suffix.slice(4) : parts.suffix
  return normalizePathname(parts.pathname, folderNames) + suffix
}

function normalizeBase(base: string) {
  let normalizedBase = base || '/'
  if (!normalizedBase.startsWith('/')) normalizedBase = '/' + normalizedBase
  if (!normalizedBase.endsWith('/')) normalizedBase += '/'
  return normalizedBase
}

function addBaseToLink(url: string, base: string) {
  if (isExternal(url) || url.startsWith('#') || url.startsWith('?')) return url

  const parts = splitUrl(url)
  if (parts.pathname.startsWith('/')) {
    const basePath = base.slice(0, -1)
    if (parts.pathname === basePath || parts.pathname.startsWith(base)) return url

    const basename = parts.pathname.slice(parts.pathname.lastIndexOf('/') + 1)
    if (!basename || basename.includes('.')) return url
    return base + parts.pathname.slice(1) + parts.suffix
  }

  if (parts.pathname.startsWith('./') || parts.pathname.startsWith('../')) return url
  return './' + url
}

export function normalizeLink(md: MarkdownIt, options: NormalizeLinkOptions = {}) {
  const base = normalizeBase(options.base || '/')
  const sourceDir = options.sourceDir || path.resolve(process.cwd(), 'docs')
  const folderNames = getFolderNames(sourceDir)
  const oldNormalizeLink = md.normalizeLink

  md.normalizeLink = function (this: MarkdownIt, url: string) {
    const normalizedUrl = isExternal(url) ? url : normalizeInternalLink(url, folderNames)
    return oldNormalizeLink.call(this, normalizedUrl)
  }

  if (base === '/') return

  md.core.ruler.after('inline', 'add-base-to-md', function (state) {
    state.tokens.forEach(blockToken => {
      if (blockToken.type !== 'inline' || !blockToken.children) return

      blockToken.children.forEach(inlineToken => {
        if (inlineToken.type !== 'link_open') return
        const href = inlineToken.attrGet('href')
        if (href) inlineToken.attrSet('href', addBaseToLink(href, base))
      })
    })
    return false
  })
}
