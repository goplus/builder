/*
 * @Author: Xu Ning
 * @Date: 2024-01-12 16:17:32
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-25 12:15:36
 * @FilePath: /spx-gui-front-private/src/util/global.js
 * @Description:
 */

/**
 * Check if an object is empty
 * @param obj an object
 * @returns
 */
export function isObjectEmpty(obj: any) {
  if (!obj) return true
  return Object.keys(obj).length === 0
}

export function debounce<T extends (...args: any[]) => any>(func: T, delay: number = 300) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const context = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}