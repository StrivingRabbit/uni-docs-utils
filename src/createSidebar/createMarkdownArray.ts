import { SidebarConfigArray, SidebarItem4Group, SidebarItem4Shortcut } from "@vuepress/types";
import type { Content } from './index.ts';

type ItemCatch = Partial<Content & SidebarItem4Group & {
  parent?: ItemCatch;
  level: number;
  [key: string]: any
}>

function createMarkdownArray(contents: Content[] = [], childrenName = 'children') {
  const markdownArray: ItemCatch[] = []
  let itemCatch: ItemCatch = {}
  for (let index = 0; index < contents.length; index++) {
    const item = contents[index];

    if (itemCatch.parent) {
      if (item.level === itemCatch.level) {
        const child = {
          ...item,
          parent: itemCatch.parent
        };
        itemCatch.parent[childrenName].push(child)
        delete itemCatch.parent
        itemCatch = child
        continue
      } else if (item.level > (itemCatch.level ?? 0)) {
        const child = {
          ...item,
          parent: itemCatch
        };
        (itemCatch[childrenName] || (itemCatch[childrenName] = [])).push(child)
        itemCatch = child
      } else {
        const parent = itemCatch.parent
        delete itemCatch.parent
        itemCatch = parent
        index--
        continue
      }
    } else {
      if (typeof itemCatch.level === 'undefined' || item.level === itemCatch.level) {
        itemCatch = item
        markdownArray.push(itemCatch)
      } else {
        const child = {
          ...item,
          parent: itemCatch
        };
        (itemCatch[childrenName] || (itemCatch[childrenName] = [])).push(child)
        itemCatch = child
        continue
      }
    }
  }

  // 移除最后一项 parent 节点，防止循环引用报错
  (function removeParent(children: ItemCatch[] = []) {
    children.forEach(child => {
      if (child.parent) delete child.parent
      if (child[childrenName]) removeParent(child[childrenName])
    })
  })(markdownArray[markdownArray.length - 1][childrenName])

  return markdownArray as SidebarConfigArray
}

export default createMarkdownArray
