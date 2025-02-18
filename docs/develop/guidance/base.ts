type Step = {
    // TODO
}

type NodeTask = {
    name: LocaleMessage,					// 节点名称
    triggerTime: number,					// 节点在视频中的触发时间(单位：秒)
    video: string,
    steps: Step[],
}

type Level = {								// 一个故事线存在多个关卡
    cover: string,							// 封面图片url
    placement: Placement, 					// 在界面上的位置信息（每个故事线中的关卡放置位置是不确定的，由人为指定）
    title: LocaleMessage,					// 关卡标题
    description: LocaleMessage,				// 关卡描述
    video: string,                          // 关卡的整体视频url（由NodeTask的视频拼接而来）
    achievement: {							// 成就与关卡绑定，一个关卡可能存在多个成就
        icon: string,					    // 成就图标url
        title: LocaleMessage,			    // 成就名称
    }
    nodeTasks: NodeTask[],
}

type StoryLine = {
    id: string
    // TODO
}

type UserStoryLineRelationship = {
    // TODO
}

type Placement = {
    /** X position in percentage */
    x: number
    /** Y position in percentage */
    y: number
  }