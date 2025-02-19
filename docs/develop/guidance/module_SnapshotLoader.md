```typescript
type Events = {
  loadCompleted: []  
  createCompleted: [snapshot: string]
}

type SnapshotData {
  metadata: Metadata  // 项目元数据
  files: Files       // 项目文件
}

type SnapshotLoader {
  loadSnapshot(snapshot: string): Promise<void>
  createSnapshot(): Promise<string>
  reset(): Promise<void>
}
```
