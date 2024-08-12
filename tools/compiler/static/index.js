// rewrite console log
(function () {
    const originalLog = console.log

    console.log = function (...message) {
        // call original function
        originalLog.apply(console, arguments)

        // send log msg
        window.parent.postMessage({log: message, level: "log"}, window.location.origin)
    }
})();

window.addEventListener('message', function (event) {
    // prevent event source
    if (event.origin !== window.location.origin) {
        console.warn()
    }

    var data = event.data
    if (data.info === "wasm") {
        let res = compilerDo(event.data)
        window.parent.postMessage({log: "", level: "wasm", cont: res}, window.location.origin)
    }
})

const compilerFnMap = {
    'getInlayHints': getInlayHints = () => {},
    'getDiagnostics': getDiagnostics = () => {},
    'getCompletionItems': getCompletionItems = () => {},
    'getDefinition': getDefinition = () => {},
    'getTypes': getTypes = (data) => {
        let fileCode = data.in.code
        let fileName = data.in.name
        let res = getTypes_GO("",fileName,fileCode)
        return JSON.parse(res)
    }
}

function compilerDo(data) {
    if (compilerFnMap.hasOwnProperty(data.f)) {
        return compilerFnMap[data.f](data)
    }
}
