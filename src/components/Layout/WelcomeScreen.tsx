import { useEffect } from 'react';
import { FileText, FolderOpen, Clock, X } from 'lucide-react';
import { useAppStore } from '@/stores';

interface WelcomeScreenProps {
  onCreateNewFile?: () => void;
  onOpenFile?: () => void;
  onViewRecentFiles?: () => void;
  onCloseTab?: () => void;
}

export function WelcomeScreen({
  onCreateNewFile,
  onOpenFile,
  onViewRecentFiles,
  onCloseTab
}: WelcomeScreenProps) {
  const { addNote, openNoteInTab, activePaneId, syncFileTreeWithNotes } = useAppStore();

  // 处理创建新文件
  const handleCreateNewFile = () => {
    const newNoteId = `note-${Date.now()}`;
    const newNote = {
      id: newNoteId,
      title: '新笔记',
      content: '# 新笔记\n\n开始编写...',
      links: [],
      backlinks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      fileType: 'markdown' as const,
      folder: '/workspace/笔记'
    };
    
    console.log('Creating new note:', newNoteId, 'activePaneId:', activePaneId);
    addNote(newNote);
    syncFileTreeWithNotes();
    console.log('Opening note in tab...');
    openNoteInTab(newNoteId, activePaneId || undefined);
    
    if (onCreateNewFile) {
      onCreateNewFile();
    }
  };

  // 处理打开文件（暂时创建示例文件）
  const handleOpenFile = () => {
    // 这里应该打开文件选择器，暂时创建一个示例文件
    const exampleNoteId = `example-${Date.now()}`;
    const exampleNote = {
      id: exampleNoteId,
      title: '示例文件',
      content: '# 示例文件\n\n这是一个示例文件。\n\n你可以在这里开始编写你的想法和笔记。',
      links: [],
      backlinks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      fileType: 'markdown' as const,
      folder: '/workspace/笔记'
    };
    
    addNote(exampleNote);
    syncFileTreeWithNotes();
    openNoteInTab(exampleNoteId, activePaneId || undefined);
    
    if (onOpenFile) {
      onOpenFile();
    }
  };

  // 处理查看近期文件
  const handleViewRecentFiles = () => {
    // TODO: 实现近期文件功能
    console.log('View recent files');
    if (onViewRecentFiles) {
      onViewRecentFiles();
    }
  };

  // 快捷操作项
  const actions = [
    {
      icon: FileText,
      label: '创建新文件',
      shortcut: '⌘ N',
      onClick: handleCreateNewFile,
      description: '创建一个新的 Markdown 文件'
    },
    {
      icon: FolderOpen,
      label: '打开文件',
      shortcut: '⌘ O',
      onClick: handleOpenFile,
      description: '从文件系统中打开现有文件'
    },
    {
      icon: Clock,
      label: '查看近期文件',
      shortcut: '⌘ ⇧ O',
      onClick: handleViewRecentFiles,
      description: '查看最近编辑过的文件'
    },
    {
      icon: X,
      label: '关闭标签页',
      shortcut: '⌘ W',
      onClick: onCloseTab,
      description: '关闭当前标签页'
    }
  ];

  // 添加键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否按下了 Cmd (Mac) 或 Ctrl (Windows/Linux)
      const isModifierPressed = e.metaKey || e.ctrlKey;
      
      if (!isModifierPressed) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          handleCreateNewFile();
          break;
        case 'o':
          e.preventDefault();
          if (e.shiftKey) {
            handleViewRecentFiles();
          } else {
            handleOpenFile();
          }
          break;
        case 'w':
          e.preventDefault();
          if (onCloseTab) {
            onCloseTab();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCloseTab]);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-background text-foreground p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold mb-2">新标签页</h1>
        <p className="text-muted-foreground">选择一个操作开始使用</p>
      </div>

      <div className="grid grid-cols-1 gap-4 w-full max-w-md">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className="group flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all duration-200 text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <action.icon className="w-5 h-5 text-muted-foreground group-hover:text-accent-foreground" />
              </div>
              <div>
                <div className="font-medium">{action.label}</div>
                {action.description && (
                  <div className="text-sm text-muted-foreground group-hover:text-accent-foreground/80">
                    {action.description}
                  </div>
                )}
              </div>
            </div>
            <div className="text-sm text-muted-foreground group-hover:text-accent-foreground font-mono">
              {action.shortcut}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          使用快捷键快速访问这些功能
        </p>
      </div>
    </div>
  );
}
