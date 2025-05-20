import type MarkdownIt from "markdown-it"

export function translate(md: MarkdownIt) {
  md.parse = (function (mdParse) {
    return function (this: MarkdownIt, src, ...array) {
      return mdParse.bind(this)(src, ...array)
    }
  })(md.parse)
  md.render = (function (mdRender) {
    return function (this: MarkdownIt, src, ...array) {
      return mdRender.bind(this)(src, ...array)
    }
  })(md.render)
};
