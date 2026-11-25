import { parseGoxMod } from '@/utils/xgo/gox-mod'
import goxMod from '../../../../tools/tutorial/gox.mod?raw'

export const tutorialClassFramework = parseGoxMod(goxMod).projects[0]
