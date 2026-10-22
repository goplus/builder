import { parseGoxMod } from '@/utils/xgo/gox-mod'

// Keep the classfile registration aligned with tools/ispx/main.go.
export const spxClassFramework = parseGoxMod(`project main.spx Game github.com/goplus/spx/v3 math
class -embed *.spx SpriteImpl
import ai github.com/goplus/builder/tools/ai
`).projects[0]
