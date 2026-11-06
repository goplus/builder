# XGo Executor

`xgoexec` is the framework-neutral runtime used by browser XGo programs. It
builds project files, runs them with ixgo, and bridges asynchronous host
capabilities and host-originated events.

`tools/tutorial` provides a class framework that may use this runtime.
`tools/xgoexec-bundle` registers frameworks, generates their ixgo exports, and
builds the `xgoexec.wasm` asset consumed by `spx-gui/build-wasm.sh`.

To add a framework, keep its implementation in its own `tools/` module, then
register its project configuration and add its qexp export to
`tools/xgoexec-bundle`.
