// Custom Theme Plugin
class CustomThemePlugin {
  constructor(manifest) {
    this.id = manifest.id;
    this.manifest = manifest;
    this.themes = {
      'dark': {
        name: 'Dark Theme',
        colors: {
          primary: '#3b82f6',
          secondary: '#6b7280',
          accent: '#10b981',
          background: '#1f2937',
          surface: '#374151',
          text: '#f9fafb',
          textSecondary: '#d1d5db',
          border: '#4b5563',
          error: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981'
        }
      },
      'light': {
        name: 'Light Theme',
        colors: {
          primary: '#3b82f6',
          secondary: '#6b7280',
          accent: '#10b981',
          background: '#ffffff',
          surface: '#f9fafb',
          text: '#111827',
          textSecondary: '#6b7280',
          border: '#d1d5db',
          error: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981'
        }
      },
      'ocean': {
        name: 'Ocean Theme',
        colors: {
          primary: '#0ea5e9',
          secondary: '#64748b',
          accent: '#06b6d4',
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f8fafc',
          textSecondary: '#cbd5e1',
          border: '#334155',
          error: '#ef4444',
          warning: '#f59e0b',
          success: '#22c55e'
        }
      }
    };
    this.currentTheme = 'default';
  }

  async onLoad(context) {
    this.context = context;
    this.logger = context.logger;
    
    this.logger.info('Custom Theme plugin loaded');
    
    // Load configuration
    this.loadConfiguration();
    
    // Apply stored theme
    this.applyStoredTheme();
    
    // Add theme selector to UI if needed
    this.addThemeControls();
  }

  async onUnload(context) {
    this.logger.info('Custom Theme plugin unloaded');
    
    // Reset to default theme
    this.removeCustomStyles();
  }

  // Command handlers
  toggleTheme() {
    const currentTheme = this.getConfig('currentTheme', 'light');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    this.applyTheme(newTheme);
    this.setConfig('currentTheme', newTheme);
    
    this.context.ui.showNotification(`Switched to ${newTheme} theme`, 'success');
    this.logger.info(`Theme toggled to: ${newTheme}`);
  }

  customizeTheme() {
    this.logger.info('Opening theme customization');
    
    // Show theme customization modal
    this.context.ui.showModal(this.createThemeCustomizationComponent());
  }

  // Hook handlers
  applyStoredTheme() {
    const storedTheme = this.getConfig('currentTheme', 'light');
    this.applyTheme(storedTheme);
  }

  // Theme management methods
  applyTheme(themeName) {
    this.currentTheme = themeName;
    
    if (this.themes[themeName]) {
      this.applyThemeColors(this.themes[themeName].colors);
    } else {
      // Apply custom theme colors
      const customColors = this.getConfig('customColors', {});
      this.applyThemeColors(customColors);
    }
    
    // Add theme class to document
    document.documentElement.className = document.documentElement.className
      .replace(/theme-\w+/g, '') + ` theme-${themeName}`;
    
    this.logger.debug(`Applied theme: ${themeName}`);
  }

  applyThemeColors(colors) {
    const root = document.documentElement;
    
    // Apply CSS custom properties
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });
    
    // Apply some common derived colors
    root.style.setProperty('--theme-primary-hover', this.lightenColor(colors.primary, 10));
    root.style.setProperty('--theme-accent-hover', this.lightenColor(colors.accent, 10));
  }

  removeCustomStyles() {
    const root = document.documentElement;
    
    // Remove custom CSS properties
    Object.keys(this.themes.light.colors).forEach(key => {
      const cssVar = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.removeProperty(cssVar);
    });
    
    // Remove theme classes
    document.documentElement.className = document.documentElement.className
      .replace(/theme-\w+/g, '');
  }

  // Theme customization UI
  createThemeCustomizationComponent() {
    return ({ onClose }) => {
      const [selectedTheme, setSelectedTheme] = React.useState(this.currentTheme);
      const [customColors, setCustomColors] = React.useState(
        this.getConfig('customColors', this.themes.light.colors)
      );
      const [previewMode, setPreviewMode] = React.useState(false);

      const applyPreview = (theme) => {
        if (theme && this.themes[theme]) {
          this.applyTheme(theme);
        } else {
          this.applyThemeColors(customColors);
        }
      };

      const saveTheme = () => {
        this.setConfig('currentTheme', selectedTheme);
        this.setConfig('customColors', customColors);
        this.applyTheme(selectedTheme);
        
        this.context.ui.showNotification('Theme saved successfully', 'success');
        onClose();
      };

      const resetToDefaults = () => {
        setCustomColors(this.themes.light.colors);
        setSelectedTheme('light');
      };

      const updateCustomColor = (colorKey, value) => {
        const newColors = { ...customColors, [colorKey]: value };
        setCustomColors(newColors);
        
        if (previewMode) {
          this.applyThemeColors(newColors);
        }
      };

      return React.createElement('div', {
        className: 'p-6 max-w-2xl',
      }, [
        React.createElement('h2', {
          key: 'title',
          className: 'text-xl font-semibold mb-4',
        }, 'Customize Theme'),

        // Theme selector
        React.createElement('div', {
          key: 'theme-selector',
          className: 'mb-6',
        }, [
          React.createElement('h3', {
            key: 'selector-title',
            className: 'text-sm font-medium mb-2',
          }, 'Choose Theme'),
          React.createElement('div', {
            key: 'theme-options',
            className: 'grid grid-cols-3 gap-3',
          }, Object.entries(this.themes).map(([key, theme]) =>
            React.createElement('button', {
              key: key,
              onClick: () => {
                setSelectedTheme(key);
                if (previewMode) applyPreview(key);
              },
              className: `p-3 border rounded-lg text-center transition-colors ${
                selectedTheme === key 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-300 hover:border-gray-400'
              }`,
            }, [
              React.createElement('div', {
                key: 'preview',
                className: 'w-full h-8 rounded mb-2 flex overflow-hidden',
              }, [
                React.createElement('div', {
                  key: 'color1',
                  className: 'flex-1',
                  style: { backgroundColor: theme.colors.primary },
                }),
                React.createElement('div', {
                  key: 'color2', 
                  className: 'flex-1',
                  style: { backgroundColor: theme.colors.accent },
                }),
                React.createElement('div', {
                  key: 'color3',
                  className: 'flex-1',
                  style: { backgroundColor: theme.colors.background },
                })
              ]),
              React.createElement('div', {
                key: 'name',
                className: 'text-xs font-medium',
              }, theme.name)
            ])
          ))
        ]),

        // Custom colors section
        React.createElement('div', {
          key: 'custom-colors',
          className: 'mb-6',
        }, [
          React.createElement('h3', {
            key: 'colors-title',
            className: 'text-sm font-medium mb-3',
          }, 'Custom Colors'),
          React.createElement('div', {
            key: 'color-inputs',
            className: 'grid grid-cols-2 gap-4',
          }, Object.entries(customColors).map(([key, value]) =>
            React.createElement('div', {
              key: key,
              className: 'flex items-center space-x-2',
            }, [
              React.createElement('label', {
                key: 'label',
                className: 'text-xs font-medium w-20 capitalize',
              }, key.replace(/([A-Z])/g, ' $1')),
              React.createElement('input', {
                key: 'color-input',
                type: 'color',
                value: value,
                onChange: (e) => updateCustomColor(key, e.target.value),
                className: 'w-8 h-8 rounded border',
              }),
              React.createElement('input', {
                key: 'text-input',
                type: 'text',
                value: value,
                onChange: (e) => updateCustomColor(key, e.target.value),
                className: 'flex-1 px-2 py-1 text-xs border rounded font-mono',
              })
            ])
          ))
        ]),

        // Preview toggle
        React.createElement('div', {
          key: 'preview-toggle',
          className: 'mb-6',
        }, [
          React.createElement('label', {
            key: 'preview-label',
            className: 'flex items-center space-x-2',
          }, [
            React.createElement('input', {
              key: 'preview-checkbox',
              type: 'checkbox',
              checked: previewMode,
              onChange: (e) => setPreviewMode(e.target.checked),
            }),
            React.createElement('span', {
              key: 'preview-text',
              className: 'text-sm',
            }, 'Live Preview')
          ])
        ]),

        // Actions
        React.createElement('div', {
          key: 'actions',
          className: 'flex justify-between',
        }, [
          React.createElement('button', {
            key: 'reset',
            onClick: resetToDefaults,
            className: 'px-4 py-2 text-sm border rounded hover:bg-gray-50 dark:hover:bg-gray-800',
          }, 'Reset to Defaults'),
          React.createElement('div', {
            key: 'primary-actions',
            className: 'space-x-2',
          }, [
            React.createElement('button', {
              key: 'cancel',
              onClick: onClose,
              className: 'px-4 py-2 text-sm border rounded hover:bg-gray-50 dark:hover:bg-gray-800',
            }, 'Cancel'),
            React.createElement('button', {
              key: 'save',
              onClick: saveTheme,
              className: 'px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600',
            }, 'Save Theme')
          ])
        ])
      ]);
    };
  }

  addThemeControls() {
    // Add theme switcher to UI if needed
    // This could add a small theme toggle button somewhere in the interface
  }

  // Utility methods
  lightenColor(color, percent) {
    // Simple color lightening utility
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  loadConfiguration() {
    const savedConfig = this.context.storage.get('config') || {};
    this.config = { ...this.manifest.config, ...savedConfig };
  }

  getConfig(key, defaultValue) {
    return this.config?.[key] ?? defaultValue;
  }

  setConfig(key, value) {
    if (!this.config) this.config = {};
    this.config[key] = value;
    this.context.storage.set('config', this.config);
  }
}

// Export plugin class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CustomThemePlugin;
} else {
  window.CustomThemePlugin = CustomThemePlugin;
}
