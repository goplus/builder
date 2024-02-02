/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-16 10:59:27
 * @FilePath: /builder/spx-gui/src/plugins/code-editor/index.ts
 * @Description: 
 */

import { register } from '@/components/code-editor/Register';

const initCodeEditor = async () => {
    register();
}

export {
    initCodeEditor
}
