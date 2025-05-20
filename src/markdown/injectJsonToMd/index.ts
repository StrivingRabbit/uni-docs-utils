import MarkdownIt from 'markdown-it';

let cssJson = {}
let utsJson = {}
let utsApiJson = {}
let utsComJson = {}
let utsUnicloudApiJson = {}
let customTypeJson = {}
let vueJson = {}
let manifestJson = {}
let pagesJson = {}
let specialStringJson = {}
let pageInstanceJson = {}

function getRegExp(key: string, text: string = '') {
  return new RegExp(`<!--\\s*${key}.([\\w\\W]+[^\\s])\\s*-->`)
}

const getJSON = (text: string): { match: RegExpMatchArray | null, json: Record<string, any>, regExp: RegExp | null } => {
  const CSSJSONRegExp = getRegExp('CSSJSON')
  let match = text.match(CSSJSONRegExp)
  CSSJSONRegExp.lastIndex = 0
  if (match) {
    return {
      match,
      json: cssJson,
      regExp: CSSJSONRegExp,
    }
  }


  const UTSJSONRegExp = getRegExp('UTSJSON')
  match = text.match(UTSJSONRegExp)
  UTSJSONRegExp.lastIndex = 0
  if (match) {
    return {
      match,
      json: utsJson,
      regExp: UTSJSONRegExp,
    }
  }

  const UTSAPIJSONRegExp = getRegExp('UTSAPIJSON')
  match = text.match(UTSAPIJSONRegExp)
  UTSAPIJSONRegExp.lastIndex = 0
  if (match) {
    return {
      match,
      json: utsApiJson,
      regExp: UTSAPIJSONRegExp,
    }
  }

  const UTSCOMJSONRegExp = getRegExp('UTSCOMJSON')
  match = text.match(UTSCOMJSONRegExp)
  UTSCOMJSONRegExp.lastIndex = 0
  if (match) {
    return {
      match,
      json: utsComJson,
      regExp: UTSCOMJSONRegExp,
    }
  }

  const UTSUNICLOUDAPIJSONRegExp = getRegExp('UTSUNICLOUDAPIJSON')
  match = text.match(UTSUNICLOUDAPIJSONRegExp)
  UTSUNICLOUDAPIJSONRegExp.lastIndex = 0
  if (match) {
    return {
      match,
      json: utsUnicloudApiJson,
      regExp: UTSUNICLOUDAPIJSONRegExp,
    }
  }

  const CUSTOMTYPEJSONRegExp = getRegExp('CUSTOMTYPEJSON')
  match = text.match(CUSTOMTYPEJSONRegExp)
  CUSTOMTYPEJSONRegExp.lastIndex = 0
  if (match) {
    return {
      match,
      json: customTypeJson,
      regExp: CUSTOMTYPEJSONRegExp,
    }
  }

  const VUEJSONRegExp = getRegExp('VUEJSON')
  match = text.match(VUEJSONRegExp)
  VUEJSONRegExp.lastIndex = 0
  if (match) {
    return {
      match,
      json: vueJson,
      regExp: VUEJSONRegExp,
    }
  }

  const MANIFESTJSONRegExp = getRegExp('MANIFESTJSON')
  match = text.match(MANIFESTJSONRegExp)
  MANIFESTJSONRegExp.lastIndex = 0
  if (match) {
    return {
      match,
      json: manifestJson,
      regExp: MANIFESTJSONRegExp,
    }
  }

  const PAGESJSONRegExp = getRegExp('PAGESJSON')
  match = text.match(PAGESJSONRegExp)
  PAGESJSONRegExp.lastIndex = 0
  if (match) {
    return {
      match,
      json: pagesJson,
      regExp: PAGESJSONRegExp,
    }
  }

  const SPECIALSTRINGJSONRegExp = getRegExp('SPECIALSTRINGJSON')
  match = text.match(SPECIALSTRINGJSONRegExp)
  SPECIALSTRINGJSONRegExp.lastIndex = 0
  if (match) {
    return {
      match,
      json: specialStringJson,
      regExp: SPECIALSTRINGJSONRegExp,
    }
  }

  const PAGEINSTANCERegExp = getRegExp('PAGEINSTANCE')
  match = text.match(PAGEINSTANCERegExp)
  PAGEINSTANCERegExp.lastIndex = 0
  if (match) {
    return {
      match,
      json: pageInstanceJson,
      regExp: PAGEINSTANCERegExp,
    }
  }

  return {
    match: null,
    json: {},
    regExp: null,
  }
}

const NEWLINE_CHARACTER = /\r?\n/

export function injectJsonToMd(md: MarkdownIt, { jsonDirPath = '' } = {}) {
  try {
    cssJson = require(`${jsonDirPath}/cssJson.json`)
  } catch (error) { }
  try {
    utsJson = require(`${jsonDirPath}/utsJson.json`)
  } catch (error) { }
  try {
    utsApiJson = require(`${jsonDirPath}/utsApiJson.json`)
  } catch (error) { }
  try {
    utsComJson = require(`${jsonDirPath}/utsComJson.json`)
  } catch (error) { }
  try {
    utsUnicloudApiJson = require(`${jsonDirPath}/utsUnicloudApiJson.json`)
  } catch (error) { }
  try {
    customTypeJson = require(`${jsonDirPath}/customTypeJson.json`)
  } catch (error) { }
  try {
    vueJson = require(`${jsonDirPath}/vueJson.json`)
  } catch (error) { }
  try {
    manifestJson = require(`${jsonDirPath}/manifestJson.json`)
  } catch (error) { }
  try {
    pagesJson = require(`${jsonDirPath}/pagesJson.json`)
  } catch (error) { }
  try {
    specialStringJson = require(`${jsonDirPath}/specialStringJson.json`)
  } catch (error) { }
  try {
    pageInstanceJson = require(`${jsonDirPath}/pageInstanceJson.json`)
  } catch (error) { }

  md.parse = (function (MD_PARSE) {
    return function (this: MarkdownIt, src, ...args) {
      if (src && getJSON(src).match) {
        const lines = src.split(NEWLINE_CHARACTER)
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index]

          const { match, json, regExp } = getJSON(line)
          if (match && regExp) {
            const jsonPath = match[1]
            const path = jsonPath.split('.')
            let temp: any = json
            path.forEach(key => {
              if (!temp) return false
              temp = temp[key]
            })
            if (typeof temp === 'undefined') continue
            lines[index] = lines[index].replace(regExp, temp)
          }
        }

        return MD_PARSE.bind(this)(lines.join('\n'), ...args)
      }
      return MD_PARSE.bind(this)(src, ...args)
    }
  })(md.parse)
}
