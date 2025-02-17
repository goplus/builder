type Step = {
    // TODO
}

type NodeTask = {
    // TODO
}

type Level = {
    // TODO
}

type StoryLine = {
    id: string,
    backgroundImage: string,            // 故事线的背景图url
    name: string,                 		// 故事线的名字
    title: LocaleMessage,               // 故事线标题
    description: LocaleMessage,         // 故事线描述
    tag: 'easy' | 'medium' | 'hard',    // 故事线难度标签
    levels: Level[],
}

type UserStoryLineRelationship = {
    userId: string,
    storyLineId: string,
    lastFinishedLevelIndex: number,         // 故事线状态，其值为当前最新已完成的关卡下标
}