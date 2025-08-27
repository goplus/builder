import type { ProjectData } from '@/apis/project'
import html2canvas from 'html2canvas'
import { defineComponent, h, ref, nextTick } from 'vue'

interface posterProps {
    img: File
    projectData: ProjectData
}

const Poster = defineComponent({
    name: 'Poster',
    props: {
        img: { type: Object as () => File, required: true },
        projectData: { type: Object as () => ProjectData, required: true }
    },
    setup(props, { expose }) {
        const posterElementRef = ref<HTMLElement>()

        const createPoster = async (): Promise<File> => {
            if (!posterElementRef.value || !props.projectData) {
                throw new Error('Poster element not ready or project data is undefined')
            }

            // 等待 DOM 更新完成
            await nextTick()
            
            const canvas = await html2canvas(posterElementRef.value, {
                width: 600, // 减少可操控换来精细化
                height: 800
            })
            
            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob((b: Blob | null) => resolve(b), 'image/png') // 返回转换后的二进制
            )
            
            if (!blob) {
                throw new Error('Failed to generate poster')
            }
            
            const posterFile = new File([blob], `${props.projectData.name}-poster.png`, { type: 'image/png'})
            return posterFile
        }

        // 通过 expose 对外提供 createPoster 方法
        expose({
            createPoster
        })

        return () => h('div', { 
            ref: posterElementRef,
            class: 'poster-container' 
        })
    }
})

export { Poster }

export type { posterProps }