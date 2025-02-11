# UIAdapter

UIAdapter 作为编辑器适配器，负责对原先项目编辑模块的扩展以满足向导的需求。当步骤执行器需要根据步骤配置调整编辑器 UI 时，通过 UIAdapter 进行控制。

- 对外接口

```ts
interface IUIAdapter {
  adaptUI(stepId: number): Promise<void>;
  reset(): void;
  destroy(): void;
}

interface ProjectEditorState {
  apiReferences: Set<string>;
  assetList: Set<string>;
  snapshot?: StepSnapshot;
  coding?: CodingStep;
}
```

- 功能说明
  - `adaptUI`: 根据步骤 ID 获取配置，动态调整编辑器 UI，包括:
    - API 参考显示控制
    - 资源列表显示控制
    - 代码快照应用
  - `reset`: 重置编辑器状态，恢复所有内容的显示
  - `destroy`: 销毁适配器实例，清理资源

- 实现示例

```ts
export class UIAdapter implements IUIAdapter {
  private static instance: UIAdapter;
  private currentState: ProjectEditorState = {
    apiReferences: new Set(),
    assetList: new Set(),
  };

  private constructor() {}

  static getInstance(): UIAdapter {
    if (!UIAdapter.instance) {
      UIAdapter.instance = new UIAdapter();
    }
    return UIAdapter.instance;
  }

  /**
   * 通过步骤ID适配编辑器UI
   */
  async adaptUI(stepId: number): Promise<void> {
    try {
      // 1. 获取步骤配置
      const config = await this.fetchStepConfig(stepId);
      
      // 2. 更新状态
      this.updateEditorState(config);

      // 3. 应用UI变更
      this.applyUIChanges();
    } catch (error) {
      console.error('编辑器UI适配失败:', error);
    }
  }

  private async fetchStepConfig(stepId: number): Promise<UIConfig> {
    const response = await fetch(`/api/steps/${stepId}`);
    if (!response.ok) {
      throw new Error('获取步骤配置失败');
    }
    return response.json();
  }

  private updateEditorState(config: UIConfig): void {
    // 更新状态
    this.currentState = {
      apiReferences: new Set(config.apiReferences),
      assetList: new Set(config.assetList),
      snapshot: config.snapshot
      coding: config.coding
    };
  }

  private applyUIChanges(): void {
    // 1. 更新API References显示
    this.updateAPIReferences();
    
    // 2. 更新Asset列表显示
    this.updateAssetList();

    // 3. 应用代码快照
    this.applyCodeSnapshot();
  }

  private updateAPIReferences(): void {
    const editorUI = document.querySelector('.editor-ui');
    if (!editorUI) return;

    // 隐藏不需要的API
    const apiElements = editorUI.querySelectorAll('.api-reference');
    apiElements.forEach(element => {
      const apiId = element.getAttribute('data-api-id');
      if (apiId) {
        element.style.display = 
          this.currentState.apiReferences.has(apiId) ? 'block' : 'none';
      }
    });
  }

  private updateAssetList(): void {
    const assetPanel = document.querySelector('.asset-panel');
    if (!assetPanel) return;

    // 隐藏不需要的资源
    const assetElements = assetPanel.querySelectorAll('.asset-item');
    assetElements.forEach(element => {
      const assetId = element.getAttribute('data-asset-id');
      if (assetId) {
        element.style.display = 
          this.currentState.assetList.has(assetId) ? 'block' : 'none';
      }
    });
  }

  private applyCodeSnapshot(): void {
    if (!this.currentState.code) return;
    
    // 应用代码快照
    const editor = document.querySelector('.monaco-editor');
    if (editor) {
      // 通过Monaco Editor API设置代码
      // editor.setValue(this.currentState.code);
    }
  }

  /**
   * 重置编辑器状态
   */
  reset(): void {
    // 重置状态
    this.currentState = {
      apiReferences: new Set(),
      assetList: new Set(),
      snapshot: null
    };
    
    // 显示所有内容
    this.showAllContent();
  }

  private showAllContent(): void {
    // 显示所有API
    const apiElements = document.querySelectorAll('.api-reference');
    apiElements.forEach(el => (el as HTMLElement).style.display = 'block');

    // 显示所有资源
    const assetElements = document.querySelectorAll('.asset-item');
    assetElements.forEach(el => (el as HTMLElement).style.display = 'block');
  }

  destroy(): void {
    this.reset();
    UIAdapter.instance = null;
  }
}

export const uiAdapter = UIAdapter.getInstance()
```
