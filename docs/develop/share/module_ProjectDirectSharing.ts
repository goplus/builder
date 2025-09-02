/**
 * 直接分享组件
*/
// 导入必要的类型和函数
import { PlatformConfig } from "./module_platformShare"
import Poster from "./module_poster"
import { defineProps, ref, defineEmits } from "vue"
/**
 * 定义组件的props
 */
const props = defineProps<{
    projectData: {
        // 项目数据
    }
}>()

const emit = defineEmits<{
    cancelled: []
    resolved: [platfrom: string]
}>()

