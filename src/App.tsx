import { EnhancedMainLayout } from './components/Layout/EnhancedMainLayout'
import { CommandPalette } from './components/CommandPalette/CommandPalette'
import { ContextMenuProvider } from './components/ContextMenu/ContextMenuProvider'

function App() {
  return (
    <ContextMenuProvider>
      <div className="w-full h-full bg-gray-50 text-gray-900 overflow-hidden">
        <EnhancedMainLayout />
        <CommandPalette />
      </div>
    </ContextMenuProvider>
  )
}

export default App