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
})

function getInlayHints (data)  {

}

function getDiagnostics (data)  {
    let fileCode = data.in.code
    let fileName = data.in.name
    let res = getDiagnostics_GO(fileName, fileCode)
    let json = JSON.parse(res)
    if(!json.ok) {
        throw new Error("can't get diagnostics")
    }
    return json.content
}


function getCompletionItems (data)  {

}

function getDefinition (data)  {

}

function getTypes(data) {
    let fileCode = data.in.code
    let fileName = data.in.name
    let res = getTypes_GO(fileName, fileCode)
    let json = JSON.parse(res)
    if(!json.ok) {
        throw new Error("can't get diagnostics")
    }
    return json.content
}
