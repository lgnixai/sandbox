import { TestLayout } from './components/Layout/TestLayout'
import { CommandPalette } from './components/CommandPalette/CommandPalette'
import { ContextMenuProvider } from './components/ContextMenu/ContextMenuProvider'
import { DocumentManager } from './components/DocumentManager/DocumentManager'

function App() {
  return (
    <ContextMenuProvider>
      <div className="w-full h-full bg-background text-foreground overflow-hidden">
        <div className="flex h-full">
          <div className="w-1/2">
            <TestLayout />
          </div>
          <div className="w-1/2 border-l border-gray-200 dark:border-gray-700">
            <DocumentManager />
          </div>
        </div>
        <CommandPalette />
      </div>
    </ContextMenuProvider>
  )
}

export default App