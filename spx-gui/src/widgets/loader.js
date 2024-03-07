;(function () {
  // eslint-disable-next-line no-undef
  const manifest = MANIFEST
  const load = (widgetName) => {
    const jsUrl = manifest[widgetName].js
    const script = document.createElement('script')
    script.src = jsUrl
    document.body.appendChild(script)
    console.log(script)
  }
  load('spx-runner')
})()
