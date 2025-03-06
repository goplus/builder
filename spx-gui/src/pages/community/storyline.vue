<template>
  <CenteredWrapper size="medium">
    <main class="storyline-page">
      <header class="storyline-header">
        <h2>牛小七的冒险之旅</h2>
      </header>
      <div 
        class="map-wrapper"
        style="background-image: url('https://pic.962.net/up/2012-7/20127720200857101803.jpg');">
        <div 
          class="level"
          style="left: 10%;top: 10%;"></div>
          <div 
          class="level"
          style="left: 30%;top: 20%;"></div>
          <div 
          class="level"
          style="left: 50%;top: 30%;"></div>
        <div 
          class="level"
          style="left: 80%;top: 10%;"></div>
        <div 
          class="level"
          style="left: 100%;top: 20%;"></div>
        <div 
          class="level"
          style="left: 130%;top: 30%;"></div>
      </div>
      <div class="card-groups">
        <div class="card card-group-item">
          <h3>当前进度</h3>
          <div class="content">

          </div>
        </div>
        <div class="card card-group-item">
          <h3>当前章节</h3>
          <div class="content">
            快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看
          时间快点发货快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看
          时间快点发货快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看
          时间快点发货
          </div>
        </div>
        <div class="card card-group-item">
          <h3>成就系统</h3>
          <div class="content">

          </div>
        </div>
      </div>
      <div class="card description-card">
        <h3>故事背景</h3>
        <p>时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看
          时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看
          时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看
          时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看
          时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看
          时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看
          时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看
          时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看时间快点发货开始剪短发好看就好看
        </p>
      </div>
    </main>
  </CenteredWrapper>
</template>
<script setup lang="ts">
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'

</script>
<style scoped lang="scss">
.storyline-page {
  height: 1000px;
  // background-color: red;
  .storyline-header{
    text-align: center;
    h2{
      font-size: 32px;
      color: #F9A134;
    }
  }
  .map-wrapper{
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    background-color: #f0f0f0;
    margin-top: 10px;
    overflow-y: auto;
    background-size: cover;
    background-repeat: no-repeat;
    border-radius: 6px;
    .level{
      position: absolute;
      width: 80px;
      height: 120px;
      background-color: #fff;

    }
  }
  .card{
    background: white;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    cursor: pointer;
    padding: 16px;
    
    &:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }
  }
  .card-groups{
    margin-top: 20px;
    display: flex;
    flex-direction: row;
    gap: 15px;
    .card-group-item{
      flex: 1;
      min-height: 80px;
      max-height: 160px;
      display: flex;
      flex-direction: column;
      .content{
        flex-grow: 1;
        overflow: auto;
        background-color: red;
      }
    }
  }
  .description-card{
    min-height: 80px;
    margin-top: 20px;
    p{
      font-size: 12px;
    }
  }
}
</style>
