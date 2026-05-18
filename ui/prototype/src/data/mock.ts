import aiPixelImage from '@ui-images/ai-pixel.png'
import aiSideScrollingImage from '@ui-images/ai-side-scrolling.png'
import aiTopDownImage from '@ui-images/ai-top-down-view.png'
import avatarImage from '@ui-images/avatar.png'
import backdropImage from '@ui-images/backdrop.png'
import builderUsageImage from '@ui-images/builder-usage.png'
import mapImage from '@ui-images/map-bg.png'
import monitorImage from '@ui-images/monitor-colorful.png'
import personalInfoBackgroundImage from '@ui-images/personal-information-background.png'
import projectRunImage from '@ui-images/project-run.png'
import spriteReviewImage from '@ui-images/sprite-review.png'
import userBackgroundImage from '@ui-images/user-bg.png'
import niuRunProjectFile from '@/assets/projects/niu-run/niu-run.xbp?url'
import niuRunThumbnail from '@/assets/projects/niu-run/thumbnail.jpeg'
import weatherggggProjectFile from '@/assets/projects/weathergggg/Weathergggg.xbp?url'
import weatherggggThumbnail from '@/assets/projects/weathergggg/thumbnail.jpg'

export type UserProfile = {
  username: string
  displayName: string
  avatar: string
  cover: string
  bio: string
  location: string
  joinedAt: string
  followers: number
  following: number
}

export type Project = {
  id: string
  name: string
  title: string
  owner: UserProfile
  visibility?: 'public' | 'private'
  description: string
  instructions?: string
  thumbnail: string
  projectFile?: string
  tags: string[]
  likes: number
  remixes: number
  views: number
  updatedAt: string
  createdAt?: string
  remixedFrom?: {
    owner: string
    name: string
    title: string
  }
  releaseHistory?: Release[]
}

export type Course = {
  id: string
  title: string
  summary: string
  duration: string
  completed: boolean
}

export type CourseSeries = {
  id: string
  title: string
  description: string
  total: string
  updatedAt: string
  cover: string
  courses: Course[]
}

export type Sprite = {
  id: string
  name: string
  color: string
  selected: boolean
  visible: boolean
}

export type Release = {
  id: string
  version: string
  createdAt: string
  notes: string
}

export type ActivityUser = UserProfile & {
  relation: 'follower' | 'following'
}

export type DocsEndpoint = {
  method: 'GET' | 'POST'
  path: string
  title: string
  description: string
  response: string
}

export type WidgetSample = {
  id: string
  title: string
  description: string
}

export const signedInUsername = 'qingqing'

export const releases: Release[] = [
  {
    id: 'niu-run-v3',
    version: 'v3',
    createdAt: 'Today',
    notes: 'Adjusted movement timing and refreshed the local thumbnail.'
  },
  {
    id: 'niu-run-v2',
    version: 'v2',
    createdAt: '1 week ago',
    notes: 'Added touch controls and clearer start instructions.'
  },
  {
    id: 'niu-run-v1',
    version: 'v1',
    createdAt: '2 weeks ago',
    notes: 'Published the first offline prototype build.'
  }
]

export const users: UserProfile[] = [
  {
    username: 'code-kiko',
    displayName: 'Code Kiko',
    avatar: avatarImage,
    cover: userBackgroundImage,
    bio: 'Building playful coding projects and sharing remixable examples.',
    location: 'XBuilder Studio',
    joinedAt: 'Joined 2026',
    followers: 1280,
    following: 86
  },
  {
    username: 'maya',
    displayName: 'Maya',
    avatar: avatarImage,
    cover: personalInfoBackgroundImage,
    bio: 'Loves side-scrolling games, sprite animation, and bright stage design.',
    location: 'Creative Lab',
    joinedAt: 'Joined 2025',
    followers: 824,
    following: 64
  },
  {
    username: 'leo',
    displayName: 'Leo',
    avatar: avatarImage,
    cover: userBackgroundImage,
    bio: 'Prototype collector and remix challenge host.',
    location: 'Game Club',
    joinedAt: 'Joined 2025',
    followers: 614,
    following: 102
  },
  {
    username: 'qingqing',
    displayName: 'Qingqing',
    avatar: avatarImage,
    cover: personalInfoBackgroundImage,
    bio: 'Designing and testing local XBuilder prototype projects.',
    location: 'Builder Lab',
    joinedAt: 'Joined 2026',
    followers: 96,
    following: 18
  }
]

export const projects: Project[] = [
  {
    id: 'local-weathergggg',
    name: 'weathergggg',
    title: 'Weathergggg',
    owner: users[3],
    visibility: 'public',
    description: 'A local offline XBuilder game project loaded from the bundled Weathergggg.xbp file.',
    instructions: 'Press Run to play this bundled local project in the prototype.',
    thumbnail: weatherggggThumbnail,
    projectFile: weatherggggProjectFile,
    tags: ['Game', 'Local XBP', 'Offline'],
    likes: 412,
    remixes: 63,
    views: 5380,
    updatedAt: 'Today',
    createdAt: '2 weeks ago',
    releaseHistory: releases.slice(1)
  },
  {
    id: 'local-niu-run',
    name: 'niu-run',
    title: 'niu-run',
    owner: users[3],
    visibility: 'private',
    description: '被牛小花抓到你就输啦',
    instructions: '点击草地控制小牛行走',
    thumbnail: niuRunThumbnail,
    projectFile: niuRunProjectFile,
    tags: ['Game', 'Runner', 'Local XBP'],
    likes: 389,
    remixes: 57,
    views: 5010,
    updatedAt: 'Today',
    createdAt: '2 weeks ago',
    remixedFrom: {
      owner: 'code-kiko',
      name: 'forest-runner',
      title: 'Forest Runner'
    },
    releaseHistory: releases
  },
  {
    id: '1',
    name: 'forest-runner',
    title: 'Forest Runner',
    owner: users[0],
    visibility: 'public',
    description: 'A side-scrolling runner with collectible stars, moving platforms, and a timed finish.',
    thumbnail: projectRunImage,
    tags: ['Game', 'Runner', 'Remixable'],
    likes: 368,
    remixes: 54,
    views: 4920,
    updatedAt: '1 day ago',
    createdAt: '1 month ago'
  },
  {
    id: '2',
    name: 'space-catcher',
    title: 'Space Catcher',
    owner: users[1],
    visibility: 'public',
    description: 'Catch falling crystals and avoid asteroids while the backdrop changes speed.',
    thumbnail: aiSideScrollingImage,
    tags: ['Arcade', 'Sprite'],
    likes: 274,
    remixes: 39,
    views: 3560,
    updatedAt: '3 days ago',
    createdAt: '1 month ago'
  },
  {
    id: '3',
    name: 'pixel-garden',
    title: 'Pixel Garden',
    owner: users[2],
    visibility: 'public',
    description: 'Grow a garden by sequencing actions and remixing sprite costumes.',
    thumbnail: aiPixelImage,
    tags: ['Pixel', 'Tutorial'],
    likes: 221,
    remixes: 42,
    views: 2980,
    updatedAt: '5 days ago',
    createdAt: '1 month ago'
  },
  {
    id: '4',
    name: 'robot-maze',
    title: 'Robot Maze',
    owner: users[0],
    description: 'Program a robot to solve mazes with conditions and repeated commands.',
    thumbnail: monitorImage,
    tags: ['Logic', 'Maze'],
    likes: 184,
    remixes: 31,
    views: 2640,
    updatedAt: '1 week ago',
    createdAt: '2 months ago'
  },
  {
    id: '5',
    name: 'ocean-rescue',
    title: 'Ocean Rescue',
    owner: users[1],
    description: 'A top-down rescue game with animated water, score feedback, and hazards.',
    thumbnail: aiTopDownImage,
    tags: ['Top Down', 'Animation'],
    likes: 162,
    remixes: 25,
    views: 2110,
    updatedAt: '2 weeks ago',
    createdAt: '2 months ago'
  },
  {
    id: '6',
    name: 'weather-stage',
    title: 'Weather Stage',
    owner: users[2],
    description: 'Switch backdrops and sound effects to tell an interactive weather story.',
    thumbnail: backdropImage,
    tags: ['Story', 'Backdrop'],
    likes: 148,
    remixes: 18,
    views: 1890,
    updatedAt: '2 weeks ago',
    createdAt: '2 months ago'
  }
]

export const courseSeries: CourseSeries[] = [
  {
    id: 'code-kiko-usage',
    title: 'Code Kiko: XBuilder Usage',
    description: 'Learn the editor basics, sprites, backdrops, events, and project sharing.',
    total: '10 Total',
    updatedAt: '1 week ago',
    cover: mapImage,
    courses: [
      {
        id: 'start',
        title: 'Start with a Sprite',
        summary: 'Create a project, rename sprites, and run the stage.',
        duration: '8 min',
        completed: true
      },
      {
        id: 'move',
        title: 'Make It Move',
        summary: 'Use events and motion blocks to build the first interaction.',
        duration: '12 min',
        completed: false
      },
      {
        id: 'share',
        title: 'Publish and Remix',
        summary: 'Preview, publish, and remix a community project.',
        duration: '10 min',
        completed: false
      }
    ]
  },
  {
    id: 'sprite-animation',
    title: 'Sprite Animation Lab',
    description: 'Practice costume editing, visibility states, and motion feedback.',
    total: '8 Total',
    updatedAt: '2 weeks ago',
    cover: spriteReviewImage,
    courses: [
      {
        id: 'costumes',
        title: 'Costumes and Frames',
        summary: 'Build smooth sprite changes with costume frames.',
        duration: '11 min',
        completed: false
      },
      {
        id: 'visibility',
        title: 'Hide and Show',
        summary: 'Control sprite visibility and stage feedback.',
        duration: '9 min',
        completed: false
      }
    ]
  },
  {
    id: 'project-playground',
    title: 'Project Playground',
    description: 'Explore community projects and learn how remix flows work.',
    total: '6 Total',
    updatedAt: '3 weeks ago',
    cover: builderUsageImage,
    courses: [
      {
        id: 'explore',
        title: 'Find a Project',
        summary: 'Search, filter, and open a project from the community.',
        duration: '7 min',
        completed: false
      },
      {
        id: 'remix',
        title: 'Create a Remix',
        summary: 'Make a local copy and change the main sprite.',
        duration: '13 min',
        completed: false
      }
    ]
  }
]

export const editorProject = {
  project: projects[0],
  sprites: [
    {
      id: 'kiko',
      name: 'Kiko Running Character',
      color: '#36c2cf',
      selected: true,
      visible: true
    },
    {
      id: 'star',
      name: 'Collectible Golden Star',
      color: '#f3c614',
      selected: false,
      visible: false
    },
    {
      id: 'platform',
      name: 'Long Moving Platform',
      color: '#9b63f6',
      selected: false,
      visible: true
    }
  ] satisfies Sprite[]
}

export const docsEndpoints: DocsEndpoint[] = [
  {
    method: 'GET',
    path: '/api/projects',
    title: 'List projects',
    description: 'Returns a paginated local prototype project list.',
    response: '{ "data": [{ "name": "niu-run", "owner": "qingqing" }], "total": 1 }'
  },
  {
    method: 'GET',
    path: '/api/users/{username}',
    title: 'Get user profile',
    description: 'Returns a local user profile for community pages.',
    response: '{ "username": "qingqing", "displayName": "Qingqing" }'
  },
  {
    method: 'POST',
    path: '/api/copilot/messages',
    title: 'Generate local Copilot reply',
    description: 'Prototype-only static response used to preserve the documentation surface.',
    response: '{ "message": "This is a local prototype response." }'
  }
]

export const widgetSamples: WidgetSample[] = [
  {
    id: 'runner',
    title: 'Local SPX runner',
    description: 'Runs the bundled niu-run project preview with local state.'
  },
  {
    id: 'code-editor',
    title: 'Local XGo code editor',
    description: 'Shows code, diagnostics, and snippets without Monaco or LSP.'
  }
]
