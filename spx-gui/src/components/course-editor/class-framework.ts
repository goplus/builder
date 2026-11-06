import { parseGoxMod } from '@/utils/xgo/gox-mod'
import goxMod from './gox.mod.raw?raw'

export const tutorialClassFramework = parseGoxMod(goxMod).projects[0]
