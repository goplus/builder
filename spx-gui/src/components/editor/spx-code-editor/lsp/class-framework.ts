import { parseGoxMod } from '@/utils/xgo/gox-mod'

export const spxClassFrameworkConfig = parseGoxMod(`project main.spx Game github.com/goplus/spx/v3 math
class -embed *.spx SpriteImpl
import ai github.com/goplus/builder/tools/ai
`)
