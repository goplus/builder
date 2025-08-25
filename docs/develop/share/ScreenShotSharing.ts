 //传入截屏海报图片文件
defineProps<{
    poster: File
}>()

//从 platfromSelect 得到当前点击的平台名称
//从 platfromShare 拿到输出跳转 URL 的方法
import { shareIMG } from './sharePlatform'


//将跳转URL转为二维码
import './qrcode'
