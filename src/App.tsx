import { Layout } from './components/Layout/Layout'
import { CommandPalette } from './components/CommandPalette/CommandPalette'
import { ContextMenuProvider } from './components/ContextMenu/ContextMenuProvider'

function App() {
  return (
    
    <ContextMenuProvider>
      <div className="w-full h-full bg-background text-foreground overflow-hidden">
        <Layout />
        <CommandPalette />
      </div>
    </ContextMenuProvider>
  )
}

export default App