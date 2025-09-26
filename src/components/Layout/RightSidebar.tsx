import { useState, useEffect } from 'react'
import { useAppStore } from '../../stores'
import { BacklinksPanel } from '../Backlinks/BacklinksPanel'
import { OutlinePanel } from '../Outline/OutlinePanel'
import { GraphPanel } from '../Graph/GraphPanel'
import { PluginAPI } from '../../lib/plugins/api'
import type { PluginPanel } from '../../lib/plugins/types'
import { Calculator, CheckSquare } from 'lucide-react'

// Plugin Panel Renderer Component
function PluginPanelRenderer({ panel }: { panel: PluginPanel }) {
  // 根据面板内容类型渲染不同的组件
  if (panel.content && panel.content === 'calculator-component') {
    return <CalculatorPanel />
  }
  
  // 默认渲染
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {panel.icon === 'calculator' && <Calculator size={20} />}
          {panel.icon === 'check-square' && <CheckSquare size={20} />}
          {panel.title}
        </h2>
      </div>
      <div className="flex-1 p-4">
        <p className="text-muted-foreground">插件面板内容</p>
      </div>
    </div>
  )
}

// Calculator Panel Component
function CalculatorPanel() {
  const [display, setDisplay] = useState('0')
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operation, setOperation] = useState<string | null>(null)
  const [waitingForNewValue, setWaitingForNewValue] = useState(false)

  const inputNumber = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(num)
      setWaitingForNewValue(false)
    } else {
      setDisplay(display === '0' ? num : display + num)
    }
  }

  const inputOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display)

    if (previousValue === null) {
      setPreviousValue(inputValue)
    } else if (operation) {
      const currentValue = previousValue || 0
      const newValue = calculate(currentValue, inputValue, operation)

      setDisplay(String(newValue))
      setPreviousValue(newValue)
    }

    setWaitingForNewValue(true)
    setOperation(nextOperation)
  }

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case '+':
        return firstValue + secondValue
      case '-':
        return firstValue - secondValue
      case '×':
        return firstValue * secondValue
      case '÷':
        return firstValue / secondValue
      case '=':
        return secondValue
      default:
        return secondValue
    }
  }

  const performCalculation = () => {
    const inputValue = parseFloat(display)

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation)
      setDisplay(String(newValue))
      setPreviousValue(null)
      setOperation(null)
      setWaitingForNewValue(true)
    }
  }

  const clear = () => {
    setDisplay('0')
    setPreviousValue(null)
    setOperation(null)
    setWaitingForNewValue(false)
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calculator size={20} />
          Calculator
        </h2>
      </div>
      
      <div className="flex-1 p-4">
        <div className="bg-muted rounded-lg p-4 mb-4">
          <div className="text-right text-2xl font-mono min-h-[2rem]">
            {display}
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={clear}
            className="col-span-2 bg-muted hover:bg-muted/80 p-3 rounded-md font-medium"
          >
            Clear
          </button>
          <button
            onClick={() => inputOperation('÷')}
            className="bg-primary text-primary-foreground hover:bg-primary/90 p-3 rounded-md font-medium"
          >
            ÷
          </button>
          <button
            onClick={() => inputOperation('×')}
            className="bg-primary text-primary-foreground hover:bg-primary/90 p-3 rounded-md font-medium"
          >
            ×
          </button>
          
          <button onClick={() => inputNumber('7')} className="bg-muted hover:bg-muted/80 p-3 rounded-md font-medium">7</button>
          <button onClick={() => inputNumber('8')} className="bg-muted hover:bg-muted/80 p-3 rounded-md font-medium">8</button>
          <button onClick={() => inputNumber('9')} className="bg-muted hover:bg-muted/80 p-3 rounded-md font-medium">9</button>
          <button
            onClick={() => inputOperation('-')}
            className="bg-primary text-primary-foreground hover:bg-primary/90 p-3 rounded-md font-medium"
          >
            -
          </button>
          
          <button onClick={() => inputNumber('4')} className="bg-muted hover:bg-muted/80 p-3 rounded-md font-medium">4</button>
          <button onClick={() => inputNumber('5')} className="bg-muted hover:bg-muted/80 p-3 rounded-md font-medium">5</button>
          <button onClick={() => inputNumber('6')} className="bg-muted hover:bg-muted/80 p-3 rounded-md font-medium">6</button>
          <button
            onClick={() => inputOperation('+')}
            className="bg-primary text-primary-foreground hover:bg-primary/90 p-3 rounded-md font-medium"
          >
            +
          </button>
          
          <button onClick={() => inputNumber('1')} className="bg-muted hover:bg-muted/80 p-3 rounded-md font-medium">1</button>
          <button onClick={() => inputNumber('2')} className="bg-muted hover:bg-muted/80 p-3 rounded-md font-medium">2</button>
          <button onClick={() => inputNumber('3')} className="bg-muted hover:bg-muted/80 p-3 rounded-md font-medium">3</button>
          <button
            onClick={performCalculation}
            className="row-span-2 bg-primary text-primary-foreground hover:bg-primary/90 p-3 rounded-md font-medium"
          >
            =
          </button>
          
          <button
            onClick={() => inputNumber('0')}
            className="col-span-2 bg-muted hover:bg-muted/80 p-3 rounded-md font-medium"
          >
            0
          </button>
          <button onClick={() => inputNumber('.')} className="bg-muted hover:bg-muted/80 p-3 rounded-md font-medium">.</button>
        </div>
      </div>
    </div>
  )
}

export function RightSidebar() {
  const { rightActivePanel } = useAppStore()
  const [pluginPanels, setPluginPanels] = useState<PluginPanel[]>([])

  // Load plugin panels from backend
  useEffect(() => {
    const loadPanels = async () => {
      try {
        const panels = await PluginAPI.getRuntimePanels()
        const rightPanels = panels.filter((p: PluginPanel) => p.position === 'right')
        setPluginPanels(rightPanels)
      } catch (e) {
        console.error('Failed to load plugin panels:', e)
      }
    }
    loadPanels()
  }, [])

  const renderPanel = () => {
    // 如果有插件面板，优先显示插件面板
    if (pluginPanels.length > 0) {
      return (
        <div className="h-full">
          {pluginPanels.map(panel => (
            <div key={panel.id} className="h-full">
              <PluginPanelRenderer panel={panel} />
            </div>
          ))}
        </div>
      )
    }

    // 否则显示默认面板
    switch (rightActivePanel) {
      case 'backlinks':
        return <BacklinksPanel />
      case 'outline':
        return <OutlinePanel />
      case 'graph':
        return <GraphPanel />
      default:
        return <BacklinksPanel />
    }
  }

  return (
    <div 
      className="bg-sidebar text-sidebar-foreground flex flex-col relative min-w-0 h-full"
    >
      {/* 面板标题 */}
      <div className="h-8 flex items-center px-3 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {rightActivePanel === 'backlinks' && '反向链接'}
          {rightActivePanel === 'outline' && '大纲'}
          {rightActivePanel === 'graph' && '关系图'}
        </span>
      </div>

      {/* 面板内容 */}
      <div className="flex-1 overflow-hidden">
        {renderPanel()}
      </div>

      {/* 大小由父级 ResizablePanel 控制 */}
    </div>
  )
}