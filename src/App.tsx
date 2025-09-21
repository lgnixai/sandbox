import { TestLayout } from './components/Layout/TestLayout'
import { CommandPalette } from './components/CommandPalette/CommandPalette'
import { ContextMenuProvider } from './components/ContextMenu/ContextMenuProvider'

function App() {
  return (
    
    <ContextMenuProvider>
      <div className="w-full h-full bg-background text-foreground overflow-hidden">
        <TestLayout />
        <CommandPalette />
      </div>
    </ContextMenuProvider>
  )
}

export default App