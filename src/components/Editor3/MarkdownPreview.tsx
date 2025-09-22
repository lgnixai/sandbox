import ReactMarkdown from 'react-markdown'
import { useAppContext } from '../../contexts/AppContext'

interface MarkdownPreviewProps {
  content: string
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const { dispatch } = useAppContext()

  // 处理内部链接点击
  const handleLinkClick = (href: string) => {
    // 检查是否是内部链接 [[笔记名]]
    const internalLinkMatch = href.match(/^\[\[(.+)\]\]$/)
    if (internalLinkMatch) {
      const noteName = internalLinkMatch[1]
      // 查找对应的笔记并打开
      dispatch({ type: 'OPEN_NOTE_IN_TAB', noteId: noteName.toLowerCase().replace(/\s+/g, '') })
      return
    }
    
    // 外部链接在新窗口打开
    if (href.startsWith('http')) {
      window.open(href, '_blank')
    }
  }

  // 自定义链接渲染器
  const components = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    a: ({ href, children, ...props }: any) => {
      const internalLinkMatch = href?.match(/^\[\[(.+)\]\]$/)
      if (internalLinkMatch) {
        return (
          <button
            className="text-light-accent dark:text-dark-accent hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit"
            onClick={() => handleLinkClick(href)}
            {...props}
          >
            {children}
          </button>
        )
      }
      
      return (
        <a
          href={href}
          className="text-light-accent dark:text-dark-accent hover:underline"
          onClick={(e) => {
            e.preventDefault()
            handleLinkClick(href)
          }}
          {...props}
        >
          {children}
        </a>
      )
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    code: ({ inline, className, children, ...props }: any) => {
      if (inline) {
        return (
          <code
            className="bg-light-hover dark:bg-dark-hover px-1 py-0.5 rounded text-sm font-mono"
            {...props}
          >
            {children}
          </code>
        )
      }
      
      return (
        <pre className="bg-light-panel dark:bg-dark-panel p-4 rounded-lg overflow-x-auto my-4">
          <code className={`font-mono text-sm ${className || ''}`} {...props}>
            {children}
          </code>
        </pre>
      )
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blockquote: ({ children, ...props }: any) => (
      <blockquote
        className="border-l-4 border-light-accent dark:border-dark-accent pl-4 my-4 text-light-text-secondary dark:text-dark-text-secondary italic"
        {...props}
      >
        {children}
      </blockquote>
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse" {...props}>
          {children}
        </table>
      </div>
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    th: ({ children, ...props }: any) => (
      <th
        className="border border-light-border dark:border-dark-border px-3 py-2 bg-light-panel dark:bg-dark-panel font-semibold text-left"
        {...props}
      >
        {children}
      </th>
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    td: ({ children, ...props }: any) => (
      <td
        className="border border-light-border dark:border-dark-border px-3 py-2"
        {...props}
      >
        {children}
      </td>
    ),
  }

  // 预处理内容，处理内部链接
  const processContent = (text: string) => {
    return text.replace(/\[\[([^\]]+)\]\]/g, '[$1]([[$1]])')
  }

  return (
    <div className="h-full bg-light-bg dark:bg-dark-bg overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-none prose prose-sm dark:prose-invert">
        <ReactMarkdown 
          components={components}
          className="text-light-text dark:text-dark-text leading-relaxed"
        >
          {processContent(content)}
        </ReactMarkdown>
      </div>
    </div>
  )
}