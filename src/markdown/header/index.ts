import MarkdownIt from "markdown-it"
import Token from "markdown-it/lib/token"

function parseHeader(tokens: Token[]) {
  tokens.forEach((t, i) => {
    if (t.type === 'heading_open' && /h\d/.test(t.tag)) {
      const token = tokens[i + 1]
      const title = token.content
      const res = title.match(/\s*(.+?)@(.+?)\s*$/)
      if (res && token.children) {
        token.content = res[1]
        for (let i = 0, array = token.children, l = array.length; i < l; i++) {
          const token = array[l - 1 - i]
          if (token.type === 'text') {
            const title = token.content
            const res = title.match(/(.*)@.+/)
            if (res) {
              token.content = res[1]
              break
            }
          }
        }
      }
    }
  })
  return tokens
}

export function header(md: MarkdownIt) {
  md.parse = (function (mdParse) {
    return function (this: MarkdownIt, src, ...array) {
      return parseHeader(mdParse.bind(this)(src, ...array))
    }
  })(md.parse)
};
