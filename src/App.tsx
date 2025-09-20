import { Layout } from './components/Layout/Layout'
import { CommandPalette } from './components/CommandPalette/CommandPalette'
import { ContextMenuProvider } from './components/ContextMenu/ContextMenuProvider'

function App() {
  return (
    <ContextMenuProvider>
      <div className="w-full h-full bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text overflow-hidden">
        <Layout />
        <CommandPalette />
      </div>
    </ContextMenuProvider>
  )
}

export default App