import { Puzzle, Download, Settings, Star } from 'lucide-react'

export function PluginsPanel() {
  // 模拟插件数据
  const plugins = [
    {
      id: 'calendar',
      name: '日历插件',
      description: '在编辑器中添加日历视图，方便管理日程和笔记',
      version: '1.2.0',
      author: 'ReNote Team',
      installed: true,
      enabled: true,
      rating: 4.8,
      downloads: 1250
    },
    {
      id: 'mindmap',
      name: '思维导图',
      description: '将笔记转换为思维导图，更直观地展示知识结构',
      version: '2.1.0',
      author: 'Community',
      installed: false,
      enabled: false,
      rating: 4.6,
      downloads: 980
    },
    {
      id: 'templates',
      name: '模板管理器',
      description: '创建和管理笔记模板，提高写作效率',
      version: '1.0.5',
      author: 'Community',
      installed: true,
      enabled: false,
      rating: 4.4,
      downloads: 750
    }
  ]

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="p-3 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-light-text dark:text-dark-text">
            插件管理
          </span>
          <button className="text-xs text-light-accent dark:text-dark-accent hover:underline">
            浏览更多
          </button>
        </div>
      </div>

      {/* 插件列表 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-2 space-y-3">
          {plugins.map(plugin => (
            <PluginItem key={plugin.id} plugin={plugin} />
          ))}
        </div>

        {/* 开发中提示 */}
        <div className="p-4 m-4 border border-light-border dark:border-dark-border rounded-lg bg-light-hover dark:bg-dark-hover">
          <div className="flex items-start">
            <Puzzle size={20} className="mr-2 mt-1 text-light-accent dark:text-dark-accent flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-light-text dark:text-dark-text mb-1">
                插件系统开发中
              </h3>
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                我们正在开发功能强大的插件系统。未来您可以通过插件扩展更多功能，包括自定义主题、第三方集成、高级编辑工具等。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface PluginItemProps {
  plugin: {
    id: string
    name: string
    description: string
    version: string
    author: string
    installed: boolean
    enabled: boolean
    rating: number
    downloads: number
  }
}

function PluginItem({ plugin }: PluginItemProps) {
  return (
    <div className="border border-light-border dark:border-dark-border rounded-lg p-3">
      {/* 插件头部信息 */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center mb-1">
            <Puzzle size={16} className="mr-2 text-light-accent dark:text-dark-accent flex-shrink-0" />
            <h3 className="text-sm font-medium text-light-text dark:text-dark-text truncate">
              {plugin.name}
            </h3>
            {plugin.installed && (
              <span className="ml-2 text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                已安装
              </span>
            )}
          </div>
          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary line-clamp-2 mb-2">
            {plugin.description}
          </p>
        </div>
      </div>

      {/* 插件详细信息 */}
      <div className="flex items-center justify-between text-xs text-light-text-secondary dark:text-dark-text-secondary mb-3">
        <div className="flex items-center space-x-3">
          <span>v{plugin.version}</span>
          <span>{plugin.author}</span>
          <div className="flex items-center">
            <Star size={12} className="mr-1 text-yellow-500" />
            <span>{plugin.rating}</span>
          </div>
          <div className="flex items-center">
            <Download size={12} className="mr-1" />
            <span>{plugin.downloads}</span>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {plugin.installed ? (
            <>
              <button
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  plugin.enabled
                    ? 'bg-light-accent text-white dark:bg-dark-accent'
                    : 'bg-light-hover dark:bg-dark-hover text-light-text dark:text-dark-text border border-light-border dark:border-dark-border'
                }`}
              >
                {plugin.enabled ? '已启用' : '启用'}
              </button>
              <button className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 transition-colors">
                卸载
              </button>
            </>
          ) : (
            <button className="text-xs px-2 py-1 rounded bg-light-accent text-white dark:bg-dark-accent hover:opacity-80 transition-opacity">
              安装
            </button>
          )}
        </div>
        
        <button className="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors">
          <Settings size={14} className="text-light-text-secondary dark:text-dark-text-secondary" />
        </button>
      </div>
    </div>
  )
}