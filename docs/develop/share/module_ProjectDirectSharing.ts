/**
 * 直接分享组件
 */
// 导入必要的类型和函数
import { defineProps, ref, defineEmits } from "vue";
import { PlatformConfig } from "./module_platformShare";
import { ProjectData } from "@/apis/project";
import platformSelector from "./platformSelector.vue";
import Poster from "./module_poster";

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
