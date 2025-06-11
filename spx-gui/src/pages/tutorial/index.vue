<template>
  <div class="tutorial-gallery">
    <div 
      v-for="category in categories" 
      :key="category"
      class="category-section"
    >
      <h2 class="category-title">{{ category }}</h2>
      <div class="tutorials-grid">
        <div 
          v-for="tutorial in tutorialsByCategory[category]" 
          :key="tutorial.id"
          class="tutorial-card"
          @click="selectTutorial(tutorial)"
        >
          <div 
            class="tutorial-thumbnail" 
            :style="{ backgroundColor: tutorial.color }"
          ></div>
          <h3 class="tutorial-title">{{ tutorial.displayName }}</h3>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCopilotCtx } from '@/components/copilot/CopilotProvider.vue'

const router = useRouter()
const { controls: copilotControls } = useCopilotCtx()

const tutorials = ref([
  {
    id: 1,
    displayName: 'Create a project',
    color: '#4CAF50',
    category: 'Beginner',
    url: '/',
    prompt: `
### Goal

Guide users to create a new Project, helping them learn the basic operations of the Builder and understand the concept of Project.

### Steps

1. Find the "New Project" entry point
2. Open the project create modal
3. Fill the form and submit
4. Finish creating a new Project
`
  },
  {
    id: 2,
    displayName: 'Move a sprite',
    color: '#2196F3',
    category: 'Beginner',
    url: '/editor/tutorial-move-sprite',
    prompt: `
### Goal

Guide users to learn how to make sprites move around the stage using basic movement commands and understand sprite positioning concepts.

### Steps

1. Select a sprite from the sprite panel
2. Open the code editor for the selected sprite
3. Add movement commands like "move", "turn", or "go to" blocks
4. Run the project to test sprite movement
5. Experiment with different movement patterns and directions`
  },
  {
    id: 3,
    displayName: 'Animate a sprite',
    color: '#FF9800',
    category: 'Beginner',
    url: '/editor/tutorial-animate-sprite',
    prompt: `
### Goal

Guide users to create sprite animations using costumes and timing controls, helping them understand how to bring sprites to life with visual changes.

### Steps

1. Select a sprite and explore its available costumes
2. Use the "next costume" block to change sprite appearance
3. Add timing controls with "wait" blocks between costume changes
4. Create smooth animation loops using repeat blocks
5. Combine movement with costume changes for advanced animations`
  },
  {
    id: 4,
    displayName: 'Loop',
    color: '#9C27B0',
    category: 'Intermediate',
    url: '/editor/tutorial-loops',
    prompt: `
### Goal

Guide users to master loop concepts in programming, helping them understand how to create repetitive actions efficiently and avoid code duplication.

### Steps

1. Understand what loops are and why they're essential in programming
2. Learn about "repeat" blocks for executing code a specific number of times
3. Explore "forever" loops for creating continuous actions
4. Use "repeat until" blocks for conditional loops that stop when a condition is met
5. Practice combining loops with movement and animation blocks`
  },
  {
    id: 5,
    displayName: 'Listen to events',
    color: '#F44336',
    category: 'Intermediate',
    url: '/editor/tutorial-events',
    prompt: `
### Goal

Guide users to understand event-driven programming, helping them create interactive projects that respond to user input and sprite interactions.

### Steps

1. Learn what events are and how they make programs interactive
2. Use "when key pressed" blocks to handle keyboard input
3. Add "when clicked" events for mouse interaction with sprites
4. Implement sprite collision detection with "when touching" events
5. Create a simple interactive game combining multiple event types`
  },
  {
    id: 6,
    displayName: 'Make a flappy bird',
    color: '#795548',
    category: 'Advanced',
    url: '/editor/tutorial-flappy-bird',
    prompt: `
### Goal

Guide users to create a complete Flappy Bird game, combining all previously learned concepts including movement, events, loops, and game logic into a finished project.

### Steps

1. Set up the game environment with background and pipe sprites
2. Create a bird sprite with gravity physics and jump mechanics
3. Generate moving pipe obstacles that scroll across the screen
4. Implement collision detection between the bird and pipes
5. Add a scoring system that increases when passing through pipes
6. Create game over conditions and restart functionality
7. Polish the game with sound effects and visual feedback`
  }
])

const categories = computed(() => {
  return [...new Set(tutorials.value.map(tutorial => tutorial.category))]
})

const tutorialsByCategory = computed(() => {
  const grouped = {}
  categories.value.forEach(category => {
    grouped[category] = tutorials.value.filter(tutorial => tutorial.category === category)
  })
  return grouped
})

const selectTutorial = async (tutorial) => {
  try {
    // First open copilot with the tutorial prompt
    await copilotControls.open(getTutorialMessage(), getTutorialPrompt(tutorial))
    
    // Then navigate to the tutorial URL
    await router.push(tutorial.url)
  } catch (error) {
    console.error('Failed to start tutorial:', error)
    // Fallback: just navigate to the URL if copilot fails
    router.push(tutorial.url)
  }
}

const getTutorialMessage = () => {
  return `
我们开始/继续吧。这里是当前界面上的元素信息：

\`\`\`json
{
  "navbar": {
    "path": "navbar",
    "description": "The main navigation bar at the top of the page."
  },
  "projectDropdown": {
    "path": "navbar > project-dropdown",
    "description": "The dropdown menu in the navbar for project management. Hover it to see all available options."
  }
}
\`\`\`
`
}

const getTutorialPrompt = (tutorial) => {
  return `You are now helping the user to learn a tutorial course: ${tutorial.displayName}.

Please guide them through the steps as described below in tutorial info.

You can use custome element <ui-highlight-link> to help user find related UI elements.

Here is the tutorial info:

<tutorial-info>
${tutorial.prompt}
</tutorial-info>

If the user asks for help, you can provide additional information or clarify any steps.

When they finished all steps in the tutorial, and archieved expected result, use custom element <tutorial-success> to display success message.
`
}
</script>

<style scoped>
.tutorial-gallery {
  padding: 20px;
}

.category-section {
  margin-bottom: 40px;
}

.category-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #333;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
}

.tutorials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.tutorial-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
}

.tutorial-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.tutorial-thumbnail {
  width: 100%;
  height: 150px;
  object-fit: cover;
}

.tutorial-title {
  padding: 15px;
  margin: 0;
  font-size: 16px;
}
</style>