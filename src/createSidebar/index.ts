import fs from 'fs';
import path from 'path';
import MarkdownIt from "markdown-it"
import * as glob from 'glob';
import { SidebarConfig4Multiple, SidebarItem4Group } from "@vuepress/types";
import createMarkdownArray from './createMarkdownArray'
import { isExternal } from '../shared'
import createSiteMap from './createSiteMap'

interface ParseBarOptions {
	text?: string
	link?: string
	children?: string
}
export interface Content extends SidebarItem4Group {
	level: number
	config: Record<string, any>
}

const links: string[] = []

function parseBar(tab: string, file: string, options: ParseBarOptions) {
	const textName = options.text || 'text'
	const linkName = options.link || 'link'
	const contents: Content[] = []

	new MarkdownIt().parse(fs.readFileSync(file, { encoding: 'utf-8' }).replace(/<!--([\s\S]*?)-->/g, '').replace(/\t/g, '  '), {})
		.forEach(token => {
			if (token.type === 'inline') {
				let text: string | undefined
				let link: string | undefined
				let config: Partial<SidebarItem4Group> = {}
				token.children?.forEach(child => {
					switch (child.type) {
						case 'text':
							text = text || child.content
							break
						case 'link_open':
							link = link || new Map(child.attrs).get('href')
							break
						case 'code_inline':
							try {
								config = JSON.parse(child.content)
							} catch (error) { }
							break

						default:
							break
					}
				})

				if (link && !isExternal(link)) {
					if (!link.startsWith('/')) {
						const linkFirstItem = link.split('/')[0]
						if (tab.indexOf(linkFirstItem) === -1) {
							link = path.join(tab, link).replace(/\\/g, '/')
						}
					}

					link = path
						.join(
							'/',
							link
								.replace(/\.md\b/, '')
								.replace(/\bREADME\b/, '')
								.replace(/\/index/, '/')
								.replace(/\?id=/, '#')
						)
						.replace(/\\/g, '/')

					links.push(link)
				}

				contents.push({
					level: token.level,
					[textName]: text,
					[linkName]: link,
					...config,
				} as Content)
			}
		})

	return createMarkdownArray(contents, options.children)
}

export function createSidebar(sourceDir: string, vuepressPath?: string, domain?: string) {
	if (!vuepressPath) {
		vuepressPath = path.resolve(sourceDir, './.vuepress')
	}
	const sidebar: SidebarConfig4Multiple = {}

	const sideBarMdFiles = glob.sync(path.resolve(sourceDir, './**/_sidebar.md'))

	// 需要反向，vuepress 在匹配路由的时候，会按照数组的顺序匹配，所以需要将最长的路径放在最前面，否则 / 路径会第一个被匹配，导致右侧栏不跟随路由变化
	const tabs = sideBarMdFiles
		.map((file = '') => {
			const tab = (file.match(/\/docs([\s\S]+)_sidebar.md/) || [])[1]
			return tab ?? ''
		})
		.reverse();

	(process.env.DOCS_LITE ? [] : tabs).forEach(tab => {
		sidebar[tab] = parseBar(tab, path.join(sourceDir, './', tab, '_sidebar.md'), {
			text: 'title',
			link: 'path',
		})
	})

	if (domain) {
		createSiteMap(domain, links, vuepressPath, () => (links.length = 0))
	}

	return tabs.length ? sidebar : false
}
