import fs from 'node:fs/promises'
// import path from 'node:path'

import matter from 'gray-matter'
import pc from 'picocolors'
// const remark = require('remark');
// const remarkFrontmatter = require('remark-frontmatter');

import type { LinksExtension, PreparedFile } from '../types.js'
import { expandTemplate, generateMetadata, normalizePath } from './utils'
import log from './logger.js'
import { isExternal } from '../../shared/index.js'

/** Options for generating the `llms.txt` file. | 生成 `llms.txt` 文件的选项。 */
export interface GenerateLLMsTxtOptions {
  /** The source directory from which to process files. | 处理文件的源目录。 */
  srcDir: string

  /** Path to the index.md file or equivalent main documentation file. | index.md 文件或等效主文档文件的路径。 */
  indexMd: string

  /** The template to use for generating the llms.txt file. | 用于生成 llms.txt 文件的模板。 */
  LLMsTxtTemplate: string

  /** Variables to expand in the template. | 在模板中展开的变量。 */
  templateVariables: Record<string, string | boolean | undefined>

  /** The site configuration from VuePress. | 来自 VuePress 的站点配置。 */
  siteConfig: { title: string | undefined, description: string | undefined }

  /** The domain to use for absolute URLs. | 用于绝对 URL 的域名。 */
  domain?: string

  /** Extension to use for links. | 用于链接的扩展名。 */
  linksExtension: LinksExtension

  /** Whether to use clean URLs (without .html extension) | 是否使用干净的 URL（没有 .html 扩展名） */
  cleanUrls: boolean
}

/**
 * Generate the contents of the `llms.txt` file, which contains a table of contents
 * with links to all sections of the documentation.
 */
/**
 * 生成 `llms.txt` 文件的内容，其中包含指向文档所有部分的链接的目录。
 */
export async function generateLLMsTxt(
  preparedFiles: PreparedFile[],
  options: GenerateLLMsTxtOptions
): Promise<string> {
  log.info('Generating toc...')

  const {
    indexMd,
    LLMsTxtTemplate,
    templateVariables,
    siteConfig,
    domain,
    linksExtension,
    cleanUrls,
    srcDir,
  } = options

  Object.keys(templateVariables).forEach((key) => {
    const variable = templateVariables[key]
    if (typeof variable === 'undefined') {
      delete templateVariables[key]
    }
  })

  let variables = {
    title: siteConfig.title,
    description: siteConfig.description,
    toc: ''
  }

  // Try to read index.md if it exists
  // 如果 index.md 存在，尝试读取它
  try {
    if (indexMd) {
      log.info(`Reading index.md from: ${pc.cyan(indexMd)}`)
      const indexContent = await fs.readFile(indexMd, 'utf-8')
      const indexMdData = matter(indexContent)

      if (indexMdData.data.title && !templateVariables.title) {
        variables.title = indexMdData.data.title
      }

      if (indexMdData.data.description && !templateVariables.description) {
        variables.description = indexMdData.data.description
      }
    }
  } catch (error) {
    log.warn(`Failed to read index.md: ${(error as Error).message}`)
  }

  // Generate TOC if requested
  // 如果请求，生成目录
  if (!(typeof variables.toc === 'boolean' && variables.toc === false)) {
    log.info('Generating TOC from prepared files')
    variables.toc = await generateTOC(preparedFiles, {
      srcDir,
      domain,
      linksExtension,
      cleanUrls,
    })
  }

  // Expand template with variables
  // 使用变量展开模板
  return expandTemplate(LLMsTxtTemplate, variables)
}

/** Options for generating the `llms-full.txt` file. | 生成 `llms-full.txt` 文件的选项。 */
export interface GenerateLLMsFullTxtOptions {
  /** The source directory from which to process files. | 处理文件的源目录。 */
  srcDir: string

  /** The domain to use for absolute URLs. | 用于绝对 URL 的域名。 */
  domain?: string

  /** Extension to use for links. | 用于链接的扩展名。 */
  linksExtension: LinksExtension

  /** Whether to use clean URLs (without .html extension) | 是否使用干净的 URL（没有 .html 扩展名） */
  cleanUrls: boolean
}

/**
 * Options for generating the table of contents.
 */
/**
 * 生成目录的选项。
 */
interface GenerateTOCOptions {
  /** The source directory from which to process files. | 处理文件的源目录。 */
  srcDir: string

  /** The domain to use for absolute URLs. | 用于绝对 URL 的域名。 */
  domain?: string

  /** Extension to use for links. | 用于链接的扩展名。 */
  linksExtension: LinksExtension

  /** Whether to use clean URLs (without .html extension) | 是否使用干净的 URL（没有 .html 扩展名） */
  cleanUrls: boolean
}

/**
 * Generate a table of contents from the prepared files.
 */
/**
 * 从准备好的文件生成目录。
 */
export async function generateTOC(
  preparedFiles: PreparedFile[],
  options: GenerateTOCOptions
): Promise<string> {
  const { srcDir, domain, linksExtension, cleanUrls } = options

  return preparedFiles
    .map((file) => {
      // const relativePath = path.relative(srcDir, file.path)
      let normalizedPath = ''
      if (isExternal(file.path)) {
        normalizedPath = file.path
      } else {
        normalizedPath = normalizePath(file.path, {
          domain,
          linksExtension,
          cleanUrls,
        })
      }

      // Get first sentence from content if available
      // 如果可用，从内容中获取第一句话
      let description = ''
      /* const firstPara = file.file.content.split('\n\n')[0]

      if (firstPara) {
        // Extract text of the first sentence
        // 提取第一句话的文本
        const match = firstPara.match(/^[^.!?]+[.!?]/)
        if (match) {
          description = match[0].trim()
        }
      } */

      return `- [${file.title}](${normalizedPath})${description ? `: ${description}` : ''}`
    })
    .join('\n')
}
