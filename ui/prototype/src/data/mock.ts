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
import niuRunThumbnail from '@/assets/projects/niu-run/thumbnail.jpeg'
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
    description: 'A local offline XBuilder project shown with static prototype data.',
    instructions: 'Press Run to preview the project placeholder.',
    thumbnail: weatherggggThumbnail,
    tags: ['Game', 'Offline'],
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
    tags: ['Game', 'Runner'],
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
  },
  {
    id: 'map-adventure',
    title: 'Map Adventure Basics',
    description: 'Build a top-down playground with stage positioning and sprite layers.',
    total: '7 Total',
    updatedAt: '3 weeks ago',
    cover: aiTopDownImage,
    courses: [
      {
        id: 'place-sprites',
        title: 'Place Sprites on the Map',
        summary: 'Use X and Y values to arrange sprites on a playable map.',
        duration: '9 min',
        completed: false
      },
      {
        id: 'layer-order',
        title: 'Control Layer Order',
        summary: 'Bring sprites forward or send them back to compose the scene.',
        duration: '10 min',
        completed: false
      }
    ]
  },
  {
    id: 'side-scroller',
    title: 'Side Scroller Starter',
    description: 'Create a running game with direction changes, movement, and obstacles.',
    total: '9 Total',
    updatedAt: '1 month ago',
    cover: aiSideScrollingImage,
    courses: [
      {
        id: 'runner-motion',
        title: 'Runner Motion',
        summary: 'Move a character across the stage with keyboard events.',
        duration: '12 min',
        completed: false
      },
      {
        id: 'jump-obstacles',
        title: 'Jump Over Obstacles',
        summary: 'Add simple timing and obstacle interactions.',
        duration: '14 min',
        completed: false
      }
    ]
  },
  {
    id: 'pixel-art',
    title: 'Pixel Art Workshop',
    description: 'Design pixel-style characters and use them in a small interactive scene.',
    total: '5 Total',
    updatedAt: '1 month ago',
    cover: aiPixelImage,
    courses: [
      {
        id: 'pixel-character',
        title: 'Draw a Pixel Character',
        summary: 'Create a compact sprite with a readable silhouette.',
        duration: '8 min',
        completed: false
      },
      {
        id: 'pixel-stage',
        title: 'Build a Pixel Stage',
        summary: 'Match sprite scale with a simple pixel backdrop.',
        duration: '11 min',
        completed: false
      }
    ]
  },
  {
    id: 'sound-effects',
    title: 'Sound Effects Studio',
    description: 'Add sound cues to make actions, collisions, and wins feel clear.',
    total: '6 Total',
    updatedAt: '5 weeks ago',
    cover: monitorImage,
    courses: [
      {
        id: 'add-sounds',
        title: 'Add Action Sounds',
        summary: 'Bind short sounds to events and preview them in the editor.',
        duration: '9 min',
        completed: false
      },
      {
        id: 'sound-feedback',
        title: 'Use Sound Feedback',
        summary: 'Use audio cues to confirm progress and mistakes.',
        duration: '10 min',
        completed: false
      }
    ]
  },
  {
    id: 'weather-story',
    title: 'Weather Story Maker',
    description: 'Tell a story by switching backdrops, sprite looks, and sounds.',
    total: '8 Total',
    updatedAt: '5 weeks ago',
    cover: backdropImage,
    courses: [
      {
        id: 'backdrop-flow',
        title: 'Backdrop Flow',
        summary: 'Use backdrop changes to move between story moments.',
        duration: '12 min',
        completed: false
      },
      {
        id: 'weather-effects',
        title: 'Weather Effects',
        summary: 'Add wind, rain, and sunshine as stage reactions.',
        duration: '13 min',
        completed: false
      }
    ]
  },
  {
    id: 'sprite-rescue',
    title: 'Sprite Rescue Mission',
    description: 'Create a simple rescue game using messages and touch events.',
    total: '7 Total',
    updatedAt: '6 weeks ago',
    cover: projectRunImage,
    courses: [
      {
        id: 'rescue-target',
        title: 'Set a Rescue Target',
        summary: 'Choose the sprite that players need to reach.',
        duration: '8 min',
        completed: false
      },
      {
        id: 'broadcast-win',
        title: 'Broadcast a Win',
        summary: 'Send a message when the target is rescued.',
        duration: '11 min',
        completed: false
      }
    ]
  },
  {
    id: 'keyboard-control',
    title: 'Keyboard Control Lab',
    description: 'Practice key events and build reliable controls for a character.',
    total: '10 Total',
    updatedAt: '6 weeks ago',
    cover: niuRunThumbnail,
    courses: [
      {
        id: 'arrow-keys',
        title: 'Arrow Key Movement',
        summary: 'Move a sprite in four directions with key events.',
        duration: '10 min',
        completed: false
      },
      {
        id: 'turning',
        title: 'Turn and Face',
        summary: 'Flip direction and keep movement readable.',
        duration: '12 min',
        completed: false
      }
    ]
  },
  {
    id: 'collectible-game',
    title: 'Collectible Game Kit',
    description: 'Build a game where players collect items and track progress.',
    total: '9 Total',
    updatedAt: '2 months ago',
    cover: weatherggggThumbnail,
    courses: [
      {
        id: 'spawn-items',
        title: 'Spawn Items',
        summary: 'Place collectible sprites around the stage.',
        duration: '9 min',
        completed: false
      },
      {
        id: 'score-widget',
        title: 'Score Widget',
        summary: 'Use a widget to show how many items were collected.',
        duration: '12 min',
        completed: false
      }
    ]
  },
  {
    id: 'message-events',
    title: 'Message Events Practice',
    description: 'Coordinate sprites with broadcasts and message handlers.',
    total: '6 Total',
    updatedAt: '2 months ago',
    cover: builderUsageImage,
    courses: [
      {
        id: 'broadcast',
        title: 'Broadcast a Message',
        summary: 'Trigger another sprite with a message event.',
        duration: '8 min',
        completed: false
      },
      {
        id: 'wait-message',
        title: 'Wait for a Reply',
        summary: 'Chain events so sprites react in sequence.',
        duration: '10 min',
        completed: false
      }
    ]
  },
  {
    id: 'mini-platformer',
    title: 'Mini Platformer',
    description: 'Use gravity, collision, and movement to make a tiny platform game.',
    total: '12 Total',
    updatedAt: '2 months ago',
    cover: aiSideScrollingImage,
    courses: [
      {
        id: 'gravity',
        title: 'Turn on Gravity',
        summary: 'Configure physics and test falling movement.',
        duration: '12 min',
        completed: false
      },
      {
        id: 'platform-collision',
        title: 'Platform Collision',
        summary: 'Keep the character standing on stage objects.',
        duration: '15 min',
        completed: false
      }
    ]
  },
  {
    id: 'ai-sprite-generator',
    title: 'AI Sprite Generator',
    description: 'Generate sprite ideas and prepare them for a playable scene.',
    total: '5 Total',
    updatedAt: '3 months ago',
    cover: spriteReviewImage,
    courses: [
      {
        id: 'write-prompt',
        title: 'Write a Prompt',
        summary: 'Describe a sprite with category, style, and perspective.',
        duration: '7 min',
        completed: false
      },
      {
        id: 'use-generated-sprite',
        title: 'Use the Generated Sprite',
        summary: 'Add the new sprite to a project and test its size.',
        duration: '10 min',
        completed: false
      }
    ]
  },
  {
    id: 'publish-polish',
    title: 'Publish and Polish',
    description: 'Prepare a finished project with a title, thumbnail, and instructions.',
    total: '8 Total',
    updatedAt: '3 months ago',
    cover: personalInfoBackgroundImage,
    courses: [
      {
        id: 'project-page',
        title: 'Project Page Details',
        summary: 'Write instructions and notes before publishing.',
        duration: '9 min',
        completed: false
      },
      {
        id: 'thumbnail-check',
        title: 'Thumbnail Check',
        summary: 'Review the project thumbnail and preview state.',
        duration: '8 min',
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

export const widgetSamples: WidgetSample[] = [
  {
    id: 'runner',
    title: 'Project preview',
    description: 'Shows the project preview placeholder with local state.'
  },
  {
    id: 'code-editor',
    title: 'Code editor preview',
    description: 'Shows code, diagnostics, and snippets with local mock data.'
  }
]
