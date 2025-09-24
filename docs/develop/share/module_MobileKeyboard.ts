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
 * - `ZoneToKeyMapping`: keyboard zone to key mapping configuration
 *
 * ## Slots:
 * - `gameView`: Should contain ProjectRunner component
 *
 * use:
 * ```vue
 * <MobileKeyboardView
 * :ZoneToKeyMapping="{ lt: 'Q', rt: 'E' }"
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
    key: [type: KeyboardEventType, key: KeyCode];
  }
): UI;
//  {
//   const zones = Object.keys(ZoneToKeyMapping);
//   const zoneToKey = ZoneToKeyMapping;
//   const handleOnKeyEvent = (type: KeyboardEventType, key: KeyCode) => {
//     emit('key', type, key);
//   }
//   const keyButtons = zones
//     .map(
//       (zone) =>
//         `<UIKeyBtn key="${zone}" value="${zoneToKey[zone]}" active={true} key=${handleOnKeyEvent} />`
//     )
//     .join("");

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
    value: string;
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
