/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-19 11:37:01
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-19 14:10:28
 * @FilePath: /builder/spx-gui/src/plugins/code-editor/code-editor.d.ts
 * @Description:
 */
type FormatError = {
  Column: number;
  Line: number;
  Msg: string;
};
type FormatResponse = {
  Body: string;
  Error: FormatError;
};
