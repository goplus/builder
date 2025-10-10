import { dispatchKeyToEvent } from "./module_ProjectAPIs";
import type {
  MobileKeyboardZoneToKeyMapping,
  MobileKeyboardType,
} from "./module_ProjectAPIs";
import {
  KeyboardEventType,
  KeyCode,
} from "../../../spx-gui/src/components/project/sharing/MobileKeyboard/mobile-keyboard";
export type KeyboardConfig = {
  type: MobileKeyboardType;
  mapping: MobileKeyboardZoneToKeyMapping;
};
export type UI = any;

export declare function useModal<T>(
  component: any
): (props?: any) => Promise<T>;

export declare function KeyboardEditorModal(
  props: {
    zoneToKeyMapping: MobileKeyboardZoneToKeyMapping;
    projectKeys: KeyCode[];
  },
  emits: {
    resolved: (result: MobileKeyboardZoneToKeyMapping) => void;
  }
): UI;

/**
 * Mobile Keyboard View Component
 *
 * Manages the mobile keyboard layout and handles key event dispatching to ProjectRunner.
 * Now uses the globally exposed dispatchKeyToEvent method instead of requiring a ref.
 *
 * ## Props:
 * - `ZoneToKeyMapping`: Represents the mapping from each keyboard zone (lt, rt, lb, rb) to an array of KeyBtn objects contained in that zone.
 * - `projectKeys`: project keys configuration
 * ## Slots:
 * - `gameView`: Should contain ProjectRunner component
 *
 * use:
 * ```vue
 * <MobileKeyboardView
 * :ZoneToKeyMapping="{ lt: [{webKeyValue: 'Q', posx: 10, posy: 10}], rt: [{webKeyValue: 'E', posx: 10, posy: 10}] }"
 * @close="emit('close')"
 * @rerun="emit('rerun')"
 * @key="handleOnKeyEvent">
 *   <template>
 *     <ProjectRunner :project="project" />
 *   </template>
 * </MobileKeyboardView>
 * ```
 */

export declare function MobileKeyboardView(
  props: {
    zoneToKeyMapping: MobileKeyboardZoneToKeyMapping;
  },
  emits: {
    close: [];
    rerun: [];
    key: [type: KeyboardEventType, key: WebKeyValue];
  }
): UI;
//  {
//   const zones = Object.keys(zoneToKeyMapping);
//   const handleOnKeyEvent = (type: KeyboardEventType, key: WebKeyValue) => {
//     emit('key', type, key);
//   }
//   const keyButtons = zones
//     .map(
//       (zone) =>
//         `<div class="zone ${zone}">
//            ${zoneToKeyMapping[zone]
//            .map(
//              (btn) => {
//             let style = ''
//             switch (zone) {
//               case 'lt':
//                 style = `left: ${btn.posx}px; top: ${btn.posy}px; transform: translate(-50%, -50%);`
//                 break
//               case 'rt':
//                 style = `right: ${btn.posx}px; top: ${btn.posy}px; transform: translate(50%, -50%);`
//                 break
//               case 'lb':
//                 style = `left: ${btn.posx}px; bottom: ${btn.posy}px; transform: translate(-50%, 50%);`
//                 break
//               case 'rb':
//                 style = `right: ${btn.posx}px; bottom: ${btn.posy}px; transform: translate(50%, 50%);`
//                 break
//            }
//              return `<div class="key-wrapper" style="${style}">
//               <UIKeyBtn
//                 key="${btn.webKeyValue}"
//                 value="${btn.webKeyValue}"
//                 active={true}
//                 onKey=${handleOnKeyEvent}
//               />
//            </div>`
//               }
// )
//   return `
//     <div className="phone-layout">
//       <slot name="gameView">
//       </slot>
//       <div className="keyboard-zones">
//         ${keyButtons}
//       </div>
//     </div>
//   `;
// }

//  key UI in Keyboard. provide to MobileKeyboardView and MobileKeyboardEidt
// active is used to indicate whether a button has functionality（onKeyEvent）.
export declare function UIKeyBtn(
  props: {
    webKeyValue: string;
    active?: boolean;
  },
  emits: {
    key: [type: KeyboardEventType, key: KeyCode];
  }
): UI;
// {

//   function dispatchKey(type: "keydown" | "keyup", v: string) {
//   emit('key', type, v)
//   }
//   let isPressed = false;
//   function press(down: boolean) {
//     if (down && !isPressed) {
//       isPressed = true;
//       dispatchKey("keydown", props.value);
//     } else if (!down && isPressed) {
//       isPressed = false;
//       dispatchKey("keyup", props.value);
//     }
//   }
// }
