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

export declare function KeyboardEditorModal(
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
 *
 * ## Slots:
 * - `gameView`: Should contain ProjectRunner component
 *
 * use:
 * ```vue
 * <MobileKeyboardView :ZoneToKeyMapping="{ lt: 'Q', rt: 'E' }">
 *   <template>
 *     <ProjectRunner :project="project" />
 *   </template>
 * </MobileKeyboardView>
 * ```
 */
export type MobileKeyboardViewProps = {
  zoneToKeyMapping: MobileKeyboardZoneToKeyMapping;
};

export declare function MobileKeyboardView({
  zoneToKeyMapping,
}: MobileKeyboardViewProps): UI;
//  {
//   const zones = Object.keys(ZoneToKeyMapping);
//   const zoneToKey = ZoneToKeyMapping;
//   const handleKeyEvent = (type: string, key: string, code: string) => {
//     dispatchKeyToEvent(type, code);
//   };

//   const keyButtons = zones
//     .map(
//       (zone) =>
//         `<UIKeyBtn key="${zone}" value="${zoneToKey[zone]}" active={true} onKeyEvent=${handleKeyEvent} />`
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
