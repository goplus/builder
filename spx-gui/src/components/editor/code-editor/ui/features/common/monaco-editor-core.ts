// this file collects some common functions used in monaco editor.
// all code is copy from `vs code` repo, repo url: https://github.com/microsoft/vscode.

/**
 * An array representing a fuzzy match.
 *
 * 0. the score
 * 1. the offset at which matching started
 * 2. `<match_pos_N>`
 * 3. `<match_pos_1>`
 * 4. `<match_pos_0>` etc
 */
export type FuzzyScore = [score: number, wordStart: number, ...matches: number[]]

export namespace FuzzyScore {
  /**
   * No matches and value `-100`
   */
  export const Default: FuzzyScore = [-100, 0]

  export function isDefault(score?: FuzzyScore): score is [-100, 0] {
    return !score || (score.length === 2 && score[0] === -100 && score[1] === 0)
  }
}

export interface IMatch {
  start: number
  end: number
}

export function createMatches(score: undefined | FuzzyScore): IMatch[] {
  if (typeof score === 'undefined') {
    return []
  }
  const res: IMatch[] = []
  const wordPos = score[1]
  for (let i = score.length - 1; i > 1; i--) {
    const pos = score[i] + wordPos
    const last = res[res.length - 1]
    if (last && last.end === pos) {
      last.end = pos + 1
    } else {
      res.push({ start: pos, end: pos + 1 })
    }
  }
  return res
}
