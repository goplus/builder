/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-03-07 17:27:03
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-07 18:03:00
 * @FilePath: \spx-gui\src\widgets\loader.ts
 * @Description: 
 */
const load = () => {
  const jsUrl = JSURL
  const cssUrl = CSSURL
  const script = document.createElement('script')
  script.src = jsUrl
  document.body.appendChild(script)
}
