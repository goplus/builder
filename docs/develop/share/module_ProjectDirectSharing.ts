/**
 * 直接分享组件
 */
// 导入必要的类型和函数
import { PlatformConfig } from "./module_platformShare";
import Poster from "./module_ProjectPoster";
import { defineProps, ref, defineEmits } from "vue";
/**
 * 定义组件的props
 */
const props = defineProps<{
  projectData: ProjectData;
  visible: boolean;
}>();

const emit = defineEmits<{
  cancelled: [];
  resolved: [platfrom: string];
}>();
