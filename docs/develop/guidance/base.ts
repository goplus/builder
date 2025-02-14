import {LocaleMessage} from "../../../spx-gui/src/utils/i18n";
import {Position} from "../../../spx-gui/src/components/editor/code-editor/common";

type Mask = {
    tokenStartPos: Position,
    tokenEndPos: Position
}

type Placement = {
    x: number,
    y: number,
}

type Step = {
    title: LocaleMessage, 			        // 步骤名称
    description: LocaleMessage, 	        // 步骤描述
    tip: LocaleMessage, 			        // 互动提示（需要条件触发）
    duration: number, 				        // 用户当前步骤卡顿距离给提示的时长（单位：秒）
    target: string, 				        // 目标元素语义化标注的key
    content: LocaleMessage, 		        // 描述内容
    type: string,					        // 存在两种类型的步骤，分别是跟随式步骤和Coding步骤，不同的步骤会有其特有的数据结构（在后续有体现）
    isCheck: boolean, 				        // 该步骤是否涉及快照比对
    apis: string[],					        // 该步骤中需要展示的Api Reference
    sprite: string[],				            // 该步骤中需要被展示的精灵
    asset: string,                          // 该步骤中需要被展示的素材
    snapshot: {
        startSnapshot: string,		        // 初始快照
        endSnapshot: string,		        // 结束快照
    },
    coding: {						        // coding任务独有的数据结构
        path: string,				        // 编码文件路径
        codeMasks: Mask[],			        // 完形填空的mask数组，一个mask对应一个空的答案
        startPosition: Position,            // 答案展示的开始位置
        endPosition: Position,              // 答案展示的结束位置
    },
    followingMaterial: [ 			        // 跟随式任务独有的数据结构，跟随式任务的引导图片
        {
            guidanceSpriteSrc: string,		// 图片src
            placement: Placement,	        // 在UI展示的位置信息
            width: number,
            height: number,
        },
    ],
}

type NodeTask = {
    name: LocaleMessage,					// 节点名称
    triggerTime: number,					// 节点在视频中的触发时间(单位：秒)
    video: string,
    steps: Step[],
}

type Level = {								// 一个故事线存在多个关卡
    cover: string,							// 封面图片url
    placement: Placement, 					// 在界面上的位置信息
    title: LocaleMessage,					// 关卡标题
    description: LocaleMessage,				// 关卡描述
    achievement: {							// 成就与关卡绑定，一个关卡可能存在多个成就
        icon: string,					    // 成就图标url
        title: LocaleMessage,			    // 成就名称
    }
    nodeTasks: NodeTask[],
}

type StoryLine = {
    storyLineId: number,
    backgroundImage: string,				// 故事线的背景图url
    title: LocaleMessage,					// 故事线标题
    description: LocaleMessage,				// 故事线描述
    tag: LocaleMessage,						// 故事线难度标签 是一个枚举值 其可选值为：简单 中等 困难
    levels: Level[],
}

type UserStoryLineRelationship = {
    userId: string,
    storyLineId: number,
    status: number,                         // 故事线状态，其值为当前最新已完成的关卡下标
}