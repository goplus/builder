/**
 * Tutorial Class Framework 的前端半边。
 *
 * 本文件与同目录的 Go 包共同构成一个完整的框架单元：Go 半边把课程作者的调用变成
 * capability 名 + JSON 请求，这里把这些名字接到宿主（Tutorial 模块）的类型化方法上。
 * wire 名与请求字段是框架的内部契约，两端都在本目录内演进，宿主永远不需要碰 JSON。
 *
 * 刻意零依赖：不 import spx-gui 里的任何东西（executor 要的 XGoFramework 形状用
 * 结构化类型在本地声明即可兼容），这样整个 tools/tutorial 目录将来可以原样搬成
 * 独立仓库。spx-gui 通过符号链接 src/utils/tutorial-framework.ts 引用本文件，
 * 与 tools/spxls 的 index.d.ts 是同一种消费方式。
 */

/** JSON Schema 的宽松表示，与契约 base.ts 中的 JSONSchema 结构一致。 */
export type JSONSchema = Record<string, unknown>;

/** 控制 spotlight 的呈现方式，与契约 module_TutorialFramework.ts 中的同名类型一致。 */
export type SpotlightOptions = {
  /** 是否用不阻挡交互的遮罩压暗目标以外的界面。 */
  mask: boolean;
  /** 自动消隐延时（秒）；0 表示留到学习者点击任意处。 */
  duration: number;
};

/**
 * 宿主为课程程序提供的全部能力，由 Tutorial 模块组装并实现。
 * 逐条语义（resolve 时机、失败语义）见 docs/develop/tutorial-v2/module_TutorialFramework.ts。
 */
export interface TutorialFrameworkHost {
  course_showPrelude(preludeMessage: string): Promise<void>;
  course_showMessage(message: string): Promise<void>;
  course_showVideo(videoName: string): Promise<void>;
  course_complete(): Promise<void>;
  course_completeWith(feedback: string): Promise<void>;
  editor_codeEditor_filterAPIs(apis: string[]): void;
  editor_codeEditor_formatWorkspace(): Promise<void>;
  editor_project_getCode(sprite: string): string;
  editor_project_listSprites(): string[];
  editor_ruler_show(): void;
  editor_ruler_hide(): void;
  copilot_generateText(message: string): Promise<string>;
  copilot_generateJSON(message: string, schema: JSONSchema): Promise<unknown>;
  spotlight_reveal(
    target: string,
    tip: string,
    options: SpotlightOptions,
  ): Promise<void>;
}

// 与 spx-gui/src/utils/xgoexec 的 XGoFramework/XGoCapability 结构相同；
// 本地声明以保持零依赖，TypeScript 的结构化类型保证两者互相兼容。
type Capability = (request: unknown) => unknown | Promise<unknown>;
type Framework = { name: string; capabilities: Record<string, Capability> };

// 各 capability 的请求形状，与 Go 侧（tutorial.go / editor.go / copilot.go / spotlight.go）
// 的序列化结构一一对应。改任何一边都必须同步另一边。
type ContentRequest = { content: string };
type VideoRequest = { videoName: string };
type FeedbackRequest = { feedback: string };
type SpriteRequest = { sprite: string };
type FilterAPIsRequest = { apis: string[] };
type GenerateJSONRequest = { content: string; schema: JSONSchema };
type SpotlightRevealRequest = {
  target: string;
  tip: string;
  options: SpotlightOptions;
};

/**
 * 把宿主实现包装成执行器需要的 framework。
 *
 * 每个条目只做三件事：按 wire 形状解出参数、调用宿主方法、透传返回值——
 * 返回 Promise 的能力由执行器等 resolve 后才回 Go（同步返回则立即回），
 * 这里不需要任何异步处理。spotlight 的 reveal 默认值由 Go 半边物化，
 * 到达这里的 options 一定是完整的，宿主无需了解课程场景的默认是什么。
 */
export function createTutorialFramework(
  host: TutorialFrameworkHost,
): Framework {
  return {
    name: "tutorial",
    capabilities: {
      course_showPrelude: (request) =>
        host.course_showPrelude((request as ContentRequest).content),
      course_showMessage: (request) =>
        host.course_showMessage((request as ContentRequest).content),
      course_showVideo: (request) =>
        host.course_showVideo((request as VideoRequest).videoName),
      course_complete: () => host.course_complete(),
      course_completeWith: (request) =>
        host.course_completeWith((request as FeedbackRequest).feedback),
      editor_codeEditor_filterAPIs: (request) =>
        host.editor_codeEditor_filterAPIs((request as FilterAPIsRequest).apis),
      editor_codeEditor_formatWorkspace: () =>
        host.editor_codeEditor_formatWorkspace(),
      editor_project_getCode: (request) =>
        host.editor_project_getCode((request as SpriteRequest).sprite),
      editor_project_listSprites: () => host.editor_project_listSprites(),
      editor_ruler_show: () => host.editor_ruler_show(),
      editor_ruler_hide: () => host.editor_ruler_hide(),
      copilot_generateText: (request) =>
        host.copilot_generateText((request as ContentRequest).content),
      copilot_generateJSON: (request) => {
        const { content, schema } = request as GenerateJSONRequest;
        return host.copilot_generateJSON(content, schema);
      },
      spotlight_reveal: (request) => {
        const { target, tip, options } = request as SpotlightRevealRequest;
        return host.spotlight_reveal(target, tip, options);
      },
    },
  };
}
