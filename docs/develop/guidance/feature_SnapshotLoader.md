```typescript
const snapshotLoader = inject('snapshotLoader') as SnapshotLoader

const props = defineProps<{
    step: Step
}>()

const emit = defineEmits<{
    stepCompleted: []
}>()

function completeStep() {
    emit('stepCompleted')
}

onMounted() {
    snapshotLoader.loadSnapshot(props.step.startSnapshot)
}

async function validateAndComplete(): Promise<boolean> {
    const currentSnapshot = await snapshotLoader.createSnapshot()
    const isCorrect = currentSnapshot === props.step.endSnapshot
    
    if (isCorrect) {
        completeStep()
    }
    return isCorrect
}

async function handleUserAction(clickedElement: HTMLElement) {
    if (props.step.type !== 'following') return
    if (!props.step.isCheck) {
        completeStep()
        return
    }

    const targetElement = Tagging.getElementByTag(props.step.target) as HTMLElement
    if (!targetElement || !(targetElement instanceof HTMLButtonElement)) return

    if (clickedElement === targetElement) {
        validateAndComplete()
    }
}

async function handleCheckAnswer() {
    if (props.step.type === 'coding' && props.step.isCheck) {
        validateAndComplete()
    }
}
```
