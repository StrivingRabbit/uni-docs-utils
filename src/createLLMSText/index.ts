import fs from 'fs';
import path from 'path';
import pc from 'picocolors'
import matter from 'gray-matter'
/* const remark = require('remark');
const remarkFrontmatter = require('remark-frontmatter');
const remove = require('unist-util-remove'); */
import type { Plugin, SidebarItem4Group } from '@vuepress/types'
import { LlmsTXTSettings, PreparedFile } from './types';
import log from './helper/logger';
import { defaultLLMsTxtTemplate, PLUGIN_NAME } from './helper/constants';
import { generateLLMsTxt } from './helper';

export const createLLMSText: Plugin = async (userSettings: LlmsTXTSettings = {}, ctx) => {
  // Create a settings object with defaults explicitly merged
  // 创建一个设置对象，明确合并默认值
  const settings = {
    generateLLMsTxt: true,
    // generateLLMsFullTxt: true,
    // stripHTML: true,
    ignoreFiles: [] as string[],
    workDir: '' as string,
    ...userSettings,
    // Ensure workDir is set after merging
  }

  // Set to store all markdown file paths
  // 用于存储所有markdown文件路径的集合
  const mdFiles: Set<string> = new Set()

  if (settings.workDir) {
    settings.workDir = path.resolve(ctx.sourceDir, settings.workDir)
  } else {
    settings.workDir = ctx.sourceDir
  }

  log.info(
    `${pc.bold(PLUGIN_NAME)} initialized with workDir: ${pc.cyan(settings.workDir)}`
  )

  if (!ctx.isProd) {
    // In dev mode, add middleware to serve .md and .txt files as plain text
    // This would require custom code to integrate with VuePress dev server
    // 在开发模式下，添加中间件以纯文本形式提供.md和.txt文件
    // 这需要自定义代码与VuePress开发服务器集成
    log.info('Dev server configured for serving plain text docs for LLMs')
  }

  // Reset file collection
  // 重置文件集合
  mdFiles.clear()
  log.info('Starting markdown file collection')

  let preparedFiles: PreparedFile[] = []
  const pushPreparedFile = async (items: SidebarItem4Group[]) => {
    await Promise.all(
      items.map(async (item: SidebarItem4Group) => {
        if (item.path && !settings.ignoreFiles.includes(item.path)) {
          let _path = item.path
          if (_path.endsWith('/')) {
            _path = `${_path}README.md`

            try {
              fs.accessSync(path.join(settings.workDir, _path))
            } catch (error) {
              _path = `${item.path}readme.md`
            }

          } else {
            if (!_path.endsWith('.md') || !_path.endsWith('.html')) {
              _path = `${_path}.md`
            }
          }
          // const content = await fs.promises.readFile(path.join(settings.workDir, _path), 'utf-8')

          let mdFile: matter.GrayMatterFile<string> | undefined = undefined
          /* if (settings.stripHTML) {
            const cleanedMarkdown = await remark()
              .use(remarkFrontmatter)
              .use(() => {
                // Strip HTML tags
                // 去除HTML标签
                return (tree: any) => {
                  remove(tree, { type: 'html' })
                  return tree
                }
              })
              .process(content)

            mdFile = matter(String(cleanedMarkdown)) as matter.GrayMatterFile<string>
          } else {
            mdFile = matter(content) as matter.GrayMatterFile<string>
          } */
          preparedFiles.push({
            title: item.title,
            path: _path,
            file: mdFile
          })
        }
        if (item.children?.length) {
          return pushPreparedFile(item.children as SidebarItem4Group[])
        }
      })
    )
  }
  const sidebar = ctx.themeConfig.sidebar;
  await Promise.all(
    (Object.keys(sidebar)).map((key: string) => pushPreparedFile(sidebar[key] as SidebarItem4Group[]))
  )
  preparedFiles = preparedFiles.sort((a, b) => a.title.localeCompare(b.title))
  const fileCount = preparedFiles.length

  // Skip if no files found
  // 如果没有找到文件则跳过
  if (fileCount === 0) {
    log.warn(
      `No markdown files found to process. Check your \`${pc.bold('workDir')}\` and \`${pc.bold('ignoreFiles')}\` settings.`
    )
    return
  }

  log.info(
    `Processing ${pc.bold(fileCount.toString())} markdown files from ${pc.cyan(settings.workDir)}`
  )

  // @ts-expect-error
  const outDir = ctx.vuepressDir ? path.join(ctx.vuepressDir, 'public') : ctx.outDir
  // Create output directory if it doesn't exist
  // 如果输出目录不存在则创建
  try {
    await fs.promises.access(outDir)
  } catch {
    log.info(`Creating output directory: ${pc.cyan(outDir)}`)
    await fs.promises.mkdir(outDir, { recursive: true })
  }

  const tasks: Promise<void>[] = []

  // Generate llms.txt
  // 生成 llms.txt
  if (settings.generateLLMsTxt) {
    const llmsTxtPath = path.resolve(outDir, 'llms.txt')
    const templateVariables = {
      title: settings.title,
      description: settings.description,
      details: settings.details,
      toc: settings.toc,
      ...settings.customTemplateVariables,
    }

    tasks.push(
      (async () => {
        log.info(`Generating ${pc.cyan('llms.txt')}...`)
        const siteConfig = ctx.siteConfig

        let indexMdPath = path.resolve(settings.workDir, 'README.md')
        let indexMdExists = true

        try {
          await fs.promises.access(indexMdPath)
        } catch {
          indexMdExists = false
          log.warn('index.md not found in workDir, using fallback values')
        }

        if (!indexMdExists) {
          indexMdExists = true
          indexMdPath = path.resolve(settings.workDir, 'readme.md')
          try {
            await fs.promises.access(indexMdPath)
          } catch {
            indexMdExists = false
            log.warn('index.md not found in workDir, using fallback values')
          }
        }

        const content = await generateLLMsTxt(preparedFiles, {
          indexMd: indexMdExists ? indexMdPath : preparedFiles[0]?.path || '',
          srcDir: settings.workDir,
          LLMsTxtTemplate: settings.customLLMsTxtTemplate || defaultLLMsTxtTemplate,
          templateVariables: templateVariables as Record<string, string | boolean | undefined>,
          siteConfig: {
            title: siteConfig.title,
            description: siteConfig.description,
          },
          domain: settings.domain,
          linksExtension: '.md',
          cleanUrls: false,
        })

        await fs.promises.writeFile(llmsTxtPath, content, 'utf-8')
        log.success(`Generated ${pc.cyan('llms.txt')} (${pc.bold(content.length.toString())} bytes)`)
      })()
    )
  }

  // Wait for all tasks to complete
  // 等待所有任务完成
  await Promise.all(tasks)
  log.success(`${pc.bold(PLUGIN_NAME)} completed all tasks`)
}
