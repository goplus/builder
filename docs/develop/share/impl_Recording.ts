/**
 * Recording Implementation
 *
 * Recording State Management
 * Recording History: view, edit, and remove records
 */

import {
  type RecordingData,
  type RecordingService,
  type ListRecordingParams,
} from "./module_RecordingAPIs";

import { type RecordingItemContext } from "./module_Recording";
declare const recordingApis: RecordingService;

/**
 * 使用示例：完整的录屏应用
 */
export function RecordingExample() {
  let records: RecordingData[] = [];

  // 加载录屏列表
  const loadRecords = async () => {
    try {
      const response = await recordingApis.listRecording();
      records = response.data;
    } catch (error) {
      console.error("加载失败:", error);
    }
  };

  // 渲染录屏列表
  const renderRecordList = () => {
    if (records.length === 0) {
      return `<div class="empty">暂无录屏记录</div>`;
    }

    return `
      <div class="record-list">
        ${records.map((record) => renderRecordItem(record, "mine")).join("")}
      </div>
    `;
  };
}

/**
 * 简单的录屏记录项渲染函数
 */
function renderRecordItem(
  record: RecordingData,
  context: RecordingItemContext = "public",
  emits?: {
    removed: () => void;
  }
): string {
  const isOwner = record.owner === getCurrentUser().username;
  const showOperations = context === "mine" && isOwner;

  function editRecord() {
    const recordEdit = renderRecordEdit(record, {
      cancelled: () => {},
      resolved: (updatedRecord) => {},
    });
    return recordEdit;
  }

  const removeRecord = () => {
    emits?.removed();
  };

  return `
  <RouterLink :to="'/recording/${record.id}'" class="link">
    <div class="record-item" data-id="${record.id}">
      <!-- 缩略图 -->
      <div class="thumbnail">
        <img src="${record.thumbnailUrl}" alt="${record.title}" />
      </div>
      
      <!-- 信息区域 -->
      <div class="info">
        <h3 class="title">${record.title}</h3>
        <p class="description">${record.description}</p>
        
        <!-- 统计信息 -->
        <div class="stats">
          <span>❤️ ${record.likeCount}</span>
          <span>👁️ ${record.viewCount}</span>
          <span>👤 ${record.owner}</span>
        </div>
      </div>
      
      <!-- 操作按钮 -->
      ${
        showOperations
          ? `
        <div class="actions">
          <button onclick="editRecord('${record.id}')">编辑</button>
          <button onclick="removeRecord('${record.id}')">删除</button>
        </div>
      `
          : ""
      }
    </div>
  </RouterLink>
  `;
}

function renderRecordEdit(
  record: RecordingData,
  emits: {
    cancelled: () => void;
    resolved: (updatedRecord: RecordingData) => void;
  }
): string {
  function cancelFn() {
    emits.cancelled();
  }
  function saveFn() {
    emits.resolved(record);
  }

  return `
    <div class="record-edit" data-record-id="${record.id}">
      <h3>编辑录屏</h3>
      <div class="form-group">
        <label>标题:</label>
        <input id="edit-title-${record.id}" type="text" value="${record.title}" />
      </div>
      <div class="form-group">
        <label>描述:</label>
        <textarea id="edit-desc-${record.id}">${record.description}</textarea>
      </div>
      <div class="actions">
        <button onclick="${cancelFn}()">取消</button>
        <button onclick="${saveFn}()">保存</button>
      </div>
    </div>
  `;
}

declare function getCurrentUser(): { username: string };
