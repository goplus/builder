interface WidgetAssets {
  js: string
}
interface WidgetManifest {
  [key: string]: WidgetAssets
}
declare let MANIFEST: WidgetManifest
;(function () {
  const manifest = MANIFEST
  function loadWidget(widgetName: string) {
    const load = () => {
      const jsUrl = manifest[widgetName].js
      const script = document.createElement('script')
      script.src = jsUrl
      document.body.appendChild(script)
    }
    if (document.readyState !== 'loading') load()
    else window.addEventListener('DOMContentLoaded', load)
  }
  loadWidget('spx-runner')
})()
