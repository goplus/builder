type VarValue = string | Vars
type Vars = { [key: string]: VarValue }

export function getCssVars(prefix: string, uiVars: Vars) {
  return Object.entries(uiVars).reduce<{ [key: string]: string }>((cssVars, [key, value]) => {
    // key should be guaranteed to be camel-case
    key = prefix + key.replace(/([A-Z])/g, '-$1').toLowerCase()
    if (typeof value === 'string') {
      cssVars[key] = value
    } else {
      const subCssVars = getCssVars(key + '-', value)
      cssVars = { ...cssVars, ...subCssVars }
    }
    return cssVars
  }, {})
}
