import { IRange } from "./ui"

type RuntimeError = {
    Message: string
    Range: IRange
}

type RuntimeErrorList = RuntimeError[]

type CurrentRuntimeError = {
    runtimeErrorList: RuntimeErrorList
    runtimeErrorProjectHash: string
}

type Dispose = () => void

type Log = string

export interface RuntimeAbility {
    // 外部
    GetRuntimeErrors(): CurrentRuntimeError
    OnRuntimeErrors(cb: (errors: CurrentRuntimeError) => void): Dispose
    // 内部
    runtimeErrorList: RuntimeErrorList
    projectHash: string
    handleRuntimeLog(log: Log): void
    parseRuntimeLog(logList: Log[]): void
    setRuntimeErrorList(runtimeErrorList: RuntimeErrorList): void
}