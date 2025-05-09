<template>
  <UICard class="main">
    <KeepAlive>
      <SoundEditor v-if="editorCtx.project.selectedSound != null" :sound="editorCtx.project.selectedSound" />
      <SpriteEditor v-else-if="editorCtx.project.selectedSprite != null" :sprite="editorCtx.project.selectedSprite" />
      <StageEditor v-else-if="editorCtx.project.selected?.type === 'stage'" :stage="editorCtx.project.stage" />
      <EditorPlaceholder v-else />
    </KeepAlive>
  </UICard>
  <div class="sider">
    <EditorPreview />
    <EditorPanels />
  </div>
</template>

<script setup lang="ts">
import { UICard } from '@/components/ui'
import SoundEditor from './sound/SoundEditor.vue'
import SpriteEditor from './sprite/SpriteEditor.vue'
import StageEditor from './stage/StageEditor.vue'
import EditorPreview from './preview/EditorPreview.vue'
import EditorPanels from './panels/EditorPanels.vue'
import EditorPlaceholder from './common/placeholder/EditorPlaceholder.vue'
import { useEditorCtx } from './EditorContextProvider.vue'
import { onMounted, onBeforeUnmount } from 'vue'
import { useCopilotCtx } from '@/components/copilot/CopilotProvider.vue'
import {
  addSpriteFromCanvasToolDescription,
  AddSpriteFromCanvasArgsSchema,
  addStageBackdropFromCanvasToolDescription,
  AddStageBackdropFromCanvasArgsSchema
} from '@/components/copilot/mcp/definitions'
import { selectAsset } from '@/components/asset/index'
import { genSpriteFromCanvas, genBackdropFromCanvas, sprite2Asset, sound2Asset, backdrop2Asset, asset2Sprite, asset2Sound, asset2Backdrop } from '@/models/common/asset'
import { computed } from 'vue'
import type { z } from 'zod'
import type { Sprite } from '@/models/sprite'
import { Visibility, addAsset, type AssetData, updateAsset, listAsset, AssetType, type ListAssetParams } from '@/apis/asset'
import type { Sound } from '@/models/sound'
import type { Backdrop } from '@/models/backdrop'

const editorCtx = useEditorCtx()
const copilotCtx = useCopilotCtx()
const project = computed(() => editorCtx.project)

type AddSpriteFromCanvaOptions = z.infer<typeof AddSpriteFromCanvasArgsSchema>
type AddStageBackdropFromCanvasOptions = z.infer<typeof AddStageBackdropFromCanvasArgsSchema>

async function addSpriteFromCanvas(args: AddSpriteFromCanvaOptions) {
  const sprite = await genSpriteFromCanvas(args.spriteName, args.size, args.size, args.color)
  project.value.addSprite(sprite)
  await sprite.autoFit()
  selectAsset(project.value, sprite)
  project.value.saveToCloud()
  return {
    success: true,
    message: `Successfully added sprite "${args.spriteName}" to project "${project.value.name}"`
  }
}

async function addBackdropFromCanvas(args: AddStageBackdropFromCanvasOptions) {
  const backdrop = await genBackdropFromCanvas(args.backdropName, 800, 600, args.color)
  project.value.stage.addBackdrop(backdrop)
  selectAsset(project.value, backdrop)
  project.value.saveToCloud()
  return {
    success: true,
    message: `Successfully added backdrop "${args.backdropName}" to project "${project.value.name}"`
  }
}

// Register the tools with the provided descriptions and implementations
function registerProjectTools() {
  copilotCtx.mcp.registry?.registerTools(
    [
      {
        description: addSpriteFromCanvasToolDescription,
        implementation: {
          validate: (args) => {
            const result = AddSpriteFromCanvasArgsSchema.safeParse(args)
            if (!result.success) {
              throw new Error(`Invalid arguments for ${addSpriteFromCanvasToolDescription.name}: ${result.error}`)
            }
            return result.data
          },
          execute: async (args: AddSpriteFromCanvaOptions) => {
            return addSpriteFromCanvas(args)
          }
        }
      },
      {
        description: addStageBackdropFromCanvasToolDescription,
        implementation: {
          validate: (args) => {
            const result = AddStageBackdropFromCanvasArgsSchema.safeParse(args)
            if (!result.success) {
              throw new Error(
                `Invalid arguments for ${addStageBackdropFromCanvasToolDescription.name}: ${result.error}`
              )
            }
            return result.data
          },
          execute: async (args: AddStageBackdropFromCanvasOptions) => {
            return addBackdropFromCanvas(args)
          }
        }
      }
    ],
    'project-editor'
  )
}

// Register the tools when the component is mounted
onMounted(() => {
  registerProjectTools()
})

// Unregister the tools when the component is unmounted
onBeforeUnmount(() => {
  copilotCtx.mcp.registry?.unregisterProviderTools('project-editor')
})

;(window as any).releaseSprite = async function (sprite: Sprite) {
  const params = await sprite2Asset(sprite)
  const assetMetadata = sprite.assetMetadata!
  await addAsset({
    ...params,
    displayName: assetMetadata.displayName,
    category: assetMetadata.category,
    visibility: Visibility.Public
  })
}

;(window as any).releaseSound = async function (sound: Sound) {
  const params = await sound2Asset(sound)
  const assetMetadata = sound.assetMetadata!
  await addAsset({
    ...params,
    displayName: assetMetadata.displayName,
    category: assetMetadata.category,
    visibility: Visibility.Public
  })
}

;(window as any).releaseBackdrop = async function (backdrop: Backdrop) {
  const params = await backdrop2Asset(backdrop)
  const assetMetadata = backdrop.assetMetadata!
  await addAsset({
    ...params,
    displayName: assetMetadata.displayName,
    category: assetMetadata.category,
    visibility: Visibility.Public
  })
}

async function listAssetAll(params: ListAssetParams) {
  const assets: AssetData[] = []
  for (let i = 1; ; i++) {
    params.pageIndex = i
    const { data } = await listAsset({
      ...params,
      pageSize: 100,
      pageIndex: i
    })
    assets.push(...data)
    if (data.length < 100) break
  }
  return assets
}

;(window as any).listAssetAll = listAssetAll

const soundNameMap: Record<string, string | undefined> = {
  'Firework': '烟花声',
  'Water': '水声',
  'BuringFire': '火焰燃烧声',
  'SandStep': '沙地脚步声',
  'SnowfieldStep': '雪地脚步声',
  'FloorStep': '地板脚步声',
  'Thunder': '雷声',
  'Waterdrop': '水滴声',
  'Wind': '风声',
  'Whoosh': '呼呼声',
  'Fall': '坠落声',
  'CarHorn': '汽车喇叭声'
}

async function renameSound(soundData: AssetData) {
  const sound = await asset2Sound(soundData)
  const metadata = sound.assetMetadata
  if (metadata == null) throw new Error('Missing metadata')
  const displayName = metadata.displayName
  const newName = soundNameMap[displayName]
  if (newName == null) {
    console.log('Skip sound:', displayName)
    return
  }
  sound.setName(newName)
  const newData = await sound2Asset(sound)
  return updateAsset(soundData.id, {
    displayName: newName,
    type: newData.type,
    category: metadata.category,
    files: newData.files,
    filesHash: newData.filesHash,
    visibility: metadata.visibility
  })
}

async function renameSounds() {
  const sounds = await listAssetAll({ type: AssetType.Sound })
  for (const s of sounds) {
    console.log('Rename sound:', s.displayName)
    await renameSound(s)
    console.log('Rename sound done:', s.displayName)
  }
}

;(window as any).renameSounds = renameSounds

const backdropNameMap: Record<string, string | undefined> = {
  'Road1': '道路1',
  'City': '城市',
  'Street1': '街道1',
  'Road2': '道路2',
  'Street2': '街道2',
  'Square': '广场',
  'BusStation': '公交站',
  'Depot': '仓库',
  'Garden': '花园',
  'Park': '公园',
  'ParkingLot': '停车场',
  'Street3': '街道3',
  'Space1': '太空1',
  'AlienPlanet1': '外星行星1',
  'CastleInterior': '城堡内部',
  'FloatingPlanet': '浮空行星',
  'FutureCity1': '未来城市1',
  'FutureCity2': '未来城市2',
  'MagicSchool1': '魔法学校1',
  'MagicSchool2': '魔法学校2',
  'Magma': '岩浆',
  'Mars': '火星',
  'Space2': '太空2',
  'SpaceshipInterior1': '太空船内部1',
  'SpaceshipInterior2': '太空船内部2',
  'AlienPlanet2': '外星行星2',
  'Snow2': '雪景2',
  'Snow1': '雪景1',
  'Desert1': '沙漠1',
  'Forest3': '森林3',
  'Forest1': '森林1',
  'Canyon': '峡谷',
  'Cave': '洞穴',
  'Desert2': '沙漠2',
  'Forest4': '森林4',
  'IceField1': '冰原1',
  'IceField2': '冰原2',
  'Lake': '湖泊',
  'Seafloor': '海底',
  'Tundra1': '苔原1',
  'Tundra2': '苔原2',
  'Forest2': '森林2',
  'UnderwaterWorld1': '水下世界1',
  'UnderwaterWorld2': '水下世界2',
  'NightSky': '夜空',
  'SquareRuler': '方格尺',
  'SquareWallpaper': '方格壁纸',
  'TexturedBackground': '纹理背景'
}

async function renameBackdrop(backdropData: AssetData) {
  const backdrop = await asset2Backdrop(backdropData)
  const metadata = backdrop.assetMetadata
  if (metadata == null) throw new Error('Missing metadata')
  const displayName = metadata.displayName
  const newName = backdropNameMap[displayName]
  if (newName == null) {
    console.log('Skip backdrop:', displayName)
    return
  }
  backdrop.setName(newName)
  const newData = await backdrop2Asset(backdrop)
  return updateAsset(backdropData.id, {
    displayName: newName,
    type: newData.type,
    category: metadata.category,
    files: newData.files,
    filesHash: newData.filesHash,
    visibility: metadata.visibility
  })
}

async function renameBackdrops() {
  const backdrops = await listAssetAll({ type: AssetType.Backdrop })
  for (const b of backdrops) {
    console.log('Rename backdrop:', b.displayName)
    await renameBackdrop(b)
    console.log('Rename backdrop done:', b.displayName)
  }
}

;(window as any).renameBackdrops = renameBackdrops

const spriteNameMap: Record<string, string | undefined> = {
  'Tornado': '龙卷风',
  'Nurse': '护士',
  'Police': '警察',
  'Teacher': '教师',
  'Building1': '建筑1',
  'Bike1': '自行车1',
  'Buiding2': '建筑2',
  'Buiding3': '建筑3',
  'Buiding4': '建筑4',
  'Christmas gift': '圣诞礼物',
  'Car1': '汽车1',
  'Car2': '汽车2',
  'Running car1': '行驶的汽车1',
  'Running car2': '行驶的汽车2',
  'Buiding5': '建筑5',
  'Bag1': '背包1',
  'Bench': '长椅',
  'Board': '木板',
  'Computer': '电脑',
  'Cupboard': '橱柜',
  'Bell': '铃铛',
  'Bells': '铃铛组合',
  'Sunglasses2': '太阳镜2',
  'Candy cane': '糖果手杖',
  'Christmas tree': '圣诞树',
  'BlueCrystal': '蓝色水晶',
  'ColorfulCrystal': '彩色水晶',
  'Crystal1': '水晶1',
  'Crystal2': '水晶2',
  'Crystal3': '水晶3',
  'Crystal4': '水晶4',
  'Crystal5': '水晶5',
  'Diamond1': '钻石1',
  'Diamond2': '钻石2',
  'Diamond3': '钻石3',
  'Diamond4': '钻石4',
  'Diamond5': '钻石5',
  'Diamond6': '钻石6',
  'Crystal7': '水晶7',
  'Star1': '星星1',
  'Star2': '星星2',
  'Diamond7': '钻石7',
  'SpaceCapsule3': '太空舱3',
  'UFO3': '不明飞行物3',
  'UFO1': '不明飞行物1',
  'Rocket1': '火箭1',
  'Crystal6': '水晶6',
  'PurpleCrystalBox': '紫色水晶盒',
  'Elf1': '精灵1',
  'Elf2': '精灵2',
  'MagicMetal': '魔法金属',
  'MagicWand1': '魔法杖1',
  'MagicWand3': '魔法杖3',
  'MagicWand4': '魔法杖4',
  'Monster1': '怪物1',
  'Monster2': '怪物2',
  'Monster3': '怪物3',
  'Monster4': '怪物4',
  'Robot1': '机器人1',
  'Robot2': '机器人2',
  'Robot3': '机器人3',
  'SpaceCapsule': '太空舱',
  'SpaceCapsule2': '太空舱2',
  'Unicorn': '独角兽',
  'Explosion': '爆炸',
  'Tree6': '树6',
  'Coral2': '珊瑚2',
  'Coral1': '珊瑚1',
  'Coral4': '珊瑚4',
  'Coral5': '珊瑚5',
  'Coral7': '珊瑚7',
  'Coral6': '珊瑚6',
  'White Cloud': '白云',
  'Snow Flake': '雪花',
  'Flower1': '花1',
  'Flower3': '花3',
  'Flower4': '花4',
  'Flower2': '花2',
  'Flower5': '花5',
  'Flower6': '花6',
  'Leaf1': '叶子1',
  'Cactus1': '仙人掌1',
  'Seagrass1': '海草1',
  'Cactus2': '仙人掌2',
  'Leaf3': '叶子3',
  'Leaf2': '叶子2',
  'Cactus3': '仙人掌3',
  'Coral3': '珊瑚3',
  'Grass1': '草1',
  'Grass2': '草2',
  'Grass3': '草3',
  'Grass4': '草4',
  'Grass5': '草5',
  'Mushroom': '蘑菇',
  'Rose': '玫瑰',
  'Sand': '沙子',
  'Seagrass2': '海草2',
  'Seagrass3': '海草3',
  'Seagrass4': '海草4',
  'Seagrass5': '海草5',
  'Soil': '土壤',
  'Stone': '石头',
  'Stump': '树桩',
  'Tree1': '树1',
  'Tree2': '树2',
  'Tulip1': '郁金香1',
  'Tulip2': '郁金香2',
  'Snowflake': '雪花',
  'Like': '点赞',
  'Pause': '暂停',
  'Play1': '播放1',
  'Play2': '播放2',
  'Wrong': '错误',
  'Sound Open': '声音开启',
  'Right1': '正确1',
  'Dialog Box': '对话框',
  'Simple Level': '简单难度',
  'Hard Level': '困难难度',
  'Message': '消息',
  'Previous': '上一页',
  'Next': '下一页',
  'Fail': '失败',
  'Rotate': '旋转',
  'Start': '开始',
  'Win': '胜利',
  'ProgressBar': '进度条',
  'Mail': '邮件',
  'Shopping Cart': '购物车',
  'Ranking': '排行榜',
  'Information': '信息',
  'Question': '问号',
  'Setting': '设置',
  'Add': '添加',
  'Lottery Draw Button': '抽奖按钮',
  'Rectangle Button': '矩形按钮',
  'Paper Stone Scissors': '剪刀石头布',
  'Yellow A': '字母A',
  'Yellow B': '字母B',
  'Yellow E': '字母E',
  'Yellow C': '字母C',
  'Yellow D': '字母D',
  'Yellow F': '字母F',
  'Yellow I': '字母I',
  'Yellow J': '字母J',
  'Yellow K': '字母K',
  'Yellow L': '字母L',
  'Yellow H': '字母H',
  'Yellow N': '字母N',
  'Yellow G': '字母G',
  'Yellow M': '字母M',
  'Yellow O': '字母O',
  'Yellow Q': '字母Q',
  'Yellow R': '字母R',
  'Yellow S': '字母S',
  'Yellow T': '字母T',
  'Yellow U': '字母U',
  'Yellow V': '字母V',
  'Yellow W': '字母W',
  'Yellow X': '字母X',
  'Yellow Y': '字母Y',
  'Yellow Z': '字母Z',
  'Yellow P': '字母P',
  'Yellow 2': '数字2',
  'Yellow 1': '数字1',
  'Yellow 3': '数字3',
  'Yellow 0': '数字0',
  'Yellow 4': '数字4',
  'Yellow 5': '数字5',
  'Yellow 6': '数字6',
  'Yellow 7': '数字7',
  'Yellow 8': '数字8',
  'Yellow 9': '数字9',
  'PrincessAlice': '爱丽丝公主',
  'Assassin': '刺客',
  'Sandy': '桑迪',
  'ChineseMaster': '中国大师',
  'Danny': '丹尼',
  'Astronaut': '宇航员',
  'Anke': '安可',
  'Ethan': '伊森',
  'Lucy': '露西',
  'Susan': '苏珊',
  'Peter': '彼得',
  'Jack': '杰克',
  'Dominic': '多米尼克',
  'SeaLion': '海狮',
  'Penguin': '企鹅',
  'Walrus': '海象',
  'Dog': '狗',
  'Puppy': '小狗',
  'Sheep': '绵羊',
  'Tiger': '老虎',
  'Bee': '蜜蜂',
  'ChristmasDeer': '圣诞鹿',
  'Clownfish': '小丑鱼',
  'Crocodie': '鳄鱼',
  'Dolphin': '海豚',
  'Mosquito': '蚊子',
  'Seahorse': '海马',
  'Octopus': '章鱼',
  'Shark': '鲨鱼',
  'Fish': '鱼',
  'Hen': '母鸡',
  'Peacock': '孔雀',
  'Frog': '青蛙',
  'Horse': '马',
  'Fox': '狐狸',
  'Bird': '鸟',
  'Ben': '本',
  'Jane': '简',
  'David': '大卫',
  'Tina': '蒂娜',
  'Tent1': '帐篷1',
  'Schoolbag': '书包',
  'Bag': '包',
  'Bag2': '包2',
  'Cup': '杯子',
  'Cup2': '杯子2',
  'PenContainer2': '笔筒2',
  'Pencil': '铅笔',
  'Pen': '钢笔',
  'Sofa': '沙发',
  'Chair': '椅子',
  'Book1': '书1',
  'LongBench': '长凳',
  'MagicBook': '魔法书',
  'StackedBooks': '堆叠的书',
  'StackedBooks1': '堆叠的书1',
  'OpenBook': '打开的书',
  'WizardSHat2': '巫师帽2',
  'WizardSHat1': '巫师帽1',
  'MagicWand6': '魔法杖6',
  'MagicWand5': '魔法杖5',
  'MagicWand2': '魔法杖2',
  'Skull': '骷髅头',
  'MagicTreasureChest': '魔法宝箱',
  'MagicPotion': '魔法药水',
  'MagicPotion1': '魔法药水1',
  'MagicMedicineJar': '魔法药罐',
  'MagicFlame': '魔法火焰',
  'Flame': '火焰',
  'BlueMagicPotion': '蓝色魔法药水',
  'BlackWizardHat': '黑色巫师帽',
  'CrystalBall2': '水晶球2',
  'UFO4': '不明飞行物4',
  'Rocket': '火箭',
  'UFO2': '不明飞行物2',
  '草丛': '草丛',
  'PoplarTree': '杨树',
  'Stones': '石头',
  'Stones1': '石头1',
  'Mug': '马克杯',
  'Coffecup': '咖啡杯',
  'Toast': '吐司',
  'Bus': '公交车',
  'Airplane': '飞机',
  'Ship': '轮船',
  'Hospital': '医院',
  'School': '学校',
  'Dessert': '甜点',
  'Milk': '牛奶',
  'Ruler': '尺子',
  'Smartphone': '智能手机',
  'Wristwatch': '手表',
  'Dress': '裙子',
  'Strawhat': '草帽',
  'Bed': '床',
  'Tablelamp': '台灯',
  'Streelamp': '街灯',
  'Fan': '风扇',
  'Alarmclock': '闹钟',
  'Roadsign': '路标',
  'Motorcycle': '摩托车',
  'Keyboard': '键盘',
  'Trafficcone': '交通锥',
  'GlassCup': '玻璃杯',
  'Car': '汽车',
  'Book3': '书3'
}

const animationNameMap: Record<string, string | undefined> = {
  'idle': '空闲',
  'run': '跑',
  'fall': '跌倒',
  'walk': '走',
  'default': '默认',
  'dying': '消失',
}

const costumeNameMap: Record<string, string | undefined> = {
  'default': '默认',
}

async function renameSprite(spriteData: AssetData) {
  const sprite = await asset2Sprite(spriteData)
  const metadata = sprite.assetMetadata
  if (metadata == null) throw new Error('Missing metadata')
  const displayName = metadata.displayName
  const newName = spriteNameMap[displayName.trim()] ?? displayName
  if (newName === displayName) {
    console.log('Skip sprite:', displayName)
  } else {
    sprite.setName(newName)
  }
  sprite.setVisible(true)
  for (const costume of sprite.costumes) {
    const costumeName = costume.name
    const newCostumeName = costumeNameMap[costumeName.trim()] ?? costumeName
    if (newCostumeName === costumeName) {
      console.log('Skip costume:', costumeName)
      continue
    }
    costume.setName(newCostumeName)
  }
  for (const animation of sprite.animations) {
    const animationName = animation.name
    const newAnimationName = animationNameMap[animationName.trim()] ?? animationName
    if (newAnimationName === animationName) {
      console.log('Skip animation:', animationName)
      continue
    }
    animation.setName(newAnimationName)
  }
  const newData = await sprite2Asset(sprite)
  await updateAsset(spriteData.id, {
    displayName: newName,
    type: newData.type,
    category: metadata.category,
    files: newData.files,
    filesHash: newData.filesHash,
    visibility: metadata.visibility
  })
}

async function renameSprites() {
  const sprites = await listAssetAll({ type: AssetType.Sprite })
  for (const s of sprites) {
    console.log('Rename sprite:', s.displayName)
    await renameSprite(s)
    console.log('Rename sprite done:', s.displayName)
  }
}

;(window as any).renameSprites = renameSprites
</script>

<style scoped lang="scss">
.main {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: visible; // avoid cutting dropdown menu of CodeTextEditor (monaco)
}
.sider {
  flex: 0 0 492px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-middle);
}
</style>
