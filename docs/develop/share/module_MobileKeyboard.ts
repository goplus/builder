import { dispatchKeyToEvent } from "./module_ProjectAPIs";
import type {
  MobileKeyboardZoneToKeyMapping,
  MobileKeyboardType,
} from "./module_ProjectAPIs";

export type KeyboardConfig = {
  type: MobileKeyboardType;
  mapping: MobileKeyboardZoneToKeyMapping;
};
export type UI = any;

export declare function useModal<T>(
  component: any
): (props?: any) => Promise<T>;

export declare function KeyboardEditor(
  props: {
    zoneToKeyMapping: MobileKeyboardZoneToKeyMapping;
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
 * - `systemKeyConfig`: Optional array to customize system keys.If omitted, no system keys will be rendered.
 *
 * ## Slots:
 * - `gameView`: Should contain ProjectRunner component
 *
 * use:
 * ```vue
 * <MobileKeyboardView
 * :ZoneToKeyMapping="{ label: 'Q', posX: 0, posY: 0, btnWidth: 50, btnHeight: 50 }"
 * @close="emit('close')"
 * @rerun="emit('rerun')"
 * />
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
  }
): UI;
//  {
//   const zones = Object.keys(ZoneToKeyMapping);
//   const zoneToKey = ZoneToKeyMapping;
//   const handleKeyEvent = (type: string, key: string, code: string) => {
//     dispatchKeyToEvent(type, code);
//   };

//   return `
//     <div className="phone-layout">
//       <slot name="gameView">
//       </slot>
//       <div className="keyboard-zones">
//         ${keyButtons}
//       </div>
//       <div className="systemA" @click="emit('rerun')">
//       </div>
//       <div className="systemB" @click="emit('close')">
//       </div>
//     </div>
//   `;
// }

//  key UI in Keyboard. provide to MobileKeyboardView and MobileKeyboardEidt
// active is used to indicate whether a button has functionality（onKeyEvent）.
export declare function UIKeyBtn(props: {
  value: string;
  active?: boolean;
  onKeyEvent?: (type: "keydown" | "keyup", key: string, code: string) => void;
}): UI;
// {
//   function toKeyAndCode(v: string) {
//     // preprocessing
//     return { key: v, code: v };
//   }

//   function dispatchKey(type: "keydown" | "keyup", v: string) {
//     const { key, code } = toKeyAndCode(v);
//     props.onKeyEvent?.(type, key, code);
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
