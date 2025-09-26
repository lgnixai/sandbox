import { Layout } from './components/Layout/Layout'
import { CommandPalette } from './components/CommandPalette/CommandPalette'
import { ContextMenuProvider } from './components/ContextMenu/ContextMenuProvider'
import { PluginSystemProvider } from './components/Plugins/PluginSystemIntegration'

function App() {
  return (
    <PluginSystemProvider>
      <ContextMenuProvider>
        <div className="w-full h-full bg-background text-foreground overflow-hidden">
          <Layout />
          <CommandPalette />
        </div>
      </ContextMenuProvider>
    </PluginSystemProvider>
  )
}

export default App