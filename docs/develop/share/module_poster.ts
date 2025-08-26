import type { ProjectData } from '@/apis/project'
import html2canvas from 'html2canvas'
import { defineComponent, h } from 'vue'

interface posterProps {
    img: File
    projectData: ProjectData
}

async function createPoster(props: posterProps): Promise<File> {
    const posterElement = document.createElement('div')
    // 在这里通过调用处理这个DOM节点 posterElement.className = 'poster-container'、填入props信息、二维码等等
    const canvas = await html2canvas(posterElement,{
        width: 600, // 减少可操控换来精细化
        height: 800
    })
    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b: Blob | null) => resolve(b),'image/png') // 返回转换后的二进制
    )
    
    if (!blob || !props.projectData) {
        throw new Error('Failed to generate poster or project is undefined')
    }
    
    const posterFile = new File([blob], `${props.projectData.name}-poster.png`, { type: 'image/png'})
    return posterFile
}

const Poster = defineComponent({
    name: 'Poster',
    props: {
        img: { type: Object as () => File, required: true },
        projectData: { type: Object as () => ProjectData, required: true }
    },
    setup(props) {
        return () => h('div', { class: 'poster-container' })
    }
})

export { createPoster, Poster }

export type { posterProps }