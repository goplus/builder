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
  description: string
  thumbnail: string
  tags: string[]
  likes: number
  remixes: number
  views: number
  updatedAt: string
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
  }
]

export const projects: Project[] = [
  {
    id: '1',
    name: 'forest-runner',
    title: 'Forest Runner',
    owner: users[0],
    description: 'A side-scrolling runner with collectible stars, moving platforms, and a timed finish.',
    thumbnail: projectRunImage,
    tags: ['Game', 'Runner', 'Remixable'],
    likes: 368,
    remixes: 54,
    views: 4920,
    updatedAt: 'Updated 1 day ago'
  },
  {
    id: '2',
    name: 'space-catcher',
    title: 'Space Catcher',
    owner: users[1],
    description: 'Catch falling crystals and avoid asteroids while the backdrop changes speed.',
    thumbnail: aiSideScrollingImage,
    tags: ['Arcade', 'Sprite'],
    likes: 274,
    remixes: 39,
    views: 3560,
    updatedAt: 'Updated 3 days ago'
  },
  {
    id: '3',
    name: 'pixel-garden',
    title: 'Pixel Garden',
    owner: users[2],
    description: 'Grow a garden by sequencing actions and remixing sprite costumes.',
    thumbnail: aiPixelImage,
    tags: ['Pixel', 'Tutorial'],
    likes: 221,
    remixes: 42,
    views: 2980,
    updatedAt: 'Updated 5 days ago'
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
    updatedAt: 'Updated 1 week ago'
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
    updatedAt: 'Updated 2 weeks ago'
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
    updatedAt: 'Updated 2 weeks ago'
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
