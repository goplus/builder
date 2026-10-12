import { describe, expect, it } from 'vitest'
import { fromText, type Files } from '@/models/common/file'
import { checkPlaygroundCourse, findPlayedVideoNames } from './course-check'

describe('findPlayedVideoNames', () => {
  it('finds the videos played with a string literal, with or without parentheses', () => {
    const code = [
      'showVideo "intro"',
      'showVideo("step 1")',
      'showVideo `raw\\name`',
      'showVideo  (  "spaced"  )'
    ].join('\n')
    expect(findPlayedVideoNames(code)).toEqual(['intro', 'step 1', 'raw\\name', 'spaced'])
  })

  it('decodes escapes in interpreted strings', () => {
    expect(findPlayedVideoNames('showVideo "say \\"hi\\"\\u4f60"')).toEqual(['say "hi"你'])
  })

  it('skips calls in comments and names in other strings', () => {
    const code = [
      '// showVideo "line-comment"',
      '/* showVideo "block-comment"',
      '   showVideo "still-in-block" */',
      'echo "showVideo \\"in-string\\""',
      'echo `showVideo "in-raw-string"`',
      'showVideo "played"'
    ].join('\n')
    expect(findPlayedVideoNames(code)).toEqual(['played'])
  })

  it('skips identifiers that only contain the name, and names that are not literals', () => {
    const code = ['myShowVideo "a"', 'showVideos "b"', 'showVideo name', "showVideo 'c'"].join('\n')
    expect(findPlayedVideoNames(code)).toEqual([])
  })

  it('stops at an unterminated string instead of reading the lines after it', () => {
    expect(findPlayedVideoNames('showVideo "broken\nshowVideo "next"')).toEqual(['next'])
  })
})

describe('checkPlaygroundCourse', () => {
  function courseFiles(program: string): Files {
    return {
      'index.json': fromText(
        'index.json',
        JSON.stringify({ project: { type: 'spx', root: 'project' }, inEditorPath: '', copilotContext: '' })
      ),
      'main_course.gox': fromText('main_course.gox', program),
      'project/assets/index.json': fromText('index.json', '{}'),
      'assets/videos/step/index.json': fromText(
        'index.json',
        JSON.stringify({ path: 'step.mp4', builder_id: 'step-id' })
      ),
      'assets/videos/step/step.mp4': fromText('step.mp4', 'video')
    }
  }

  it('finds nothing wrong with a course whose program plays only videos it has', async () => {
    expect(
      await checkPlaygroundCourse(courseFiles('onStart => {\n\tshowVideo "step"\n\t// showVideo "gone"\n}'))
    ).toEqual([])
  })

  it('reports each missing video once', async () => {
    const problems = await checkPlaygroundCourse(
      courseFiles('onStart => {\n\tshowVideo "intro"\n\tshowVideo "intro"\n\tshowVideo "step"\n}')
    )
    expect(problems.map((problem) => problem.en)).toEqual([
      'The course program plays video "intro", which the course does not have'
    ])
  })

  it('reports missing settings and program without loading the course', async () => {
    const files = courseFiles('')
    delete files['index.json']
    delete files['main_course.gox']
    expect((await checkPlaygroundCourse(files)).map((problem) => problem.en)).toEqual([
      'The course settings (index.json) are missing',
      'The course program (main_course.gox) is missing'
    ])
  })

  it('reports a course that cannot be loaded', async () => {
    const files = courseFiles('')
    files['index.json'] = fromText('index.json', '{ not json')
    const problems = await checkPlaygroundCourse(files)
    expect(problems).toHaveLength(1)
    expect(problems[0].en).toMatch(/^The course cannot be loaded: /)
  })
})
