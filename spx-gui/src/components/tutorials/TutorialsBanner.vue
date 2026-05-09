<template>
  <div class="relative flex items-center justify-center">
    <div class="overflow-hidden">
      <img
        src="@/components/tutorials/banner.jpg"
        alt="Tutorials Banner"
        class="h-84.5 w-full object-cover object-center"
      />
    </div>
    <div class="absolute left-1/2 top-1/2 -translate-x-[15%] -translate-y-1/2 whitespace-nowrap text-title">
      <div class="text-[46px] leading-none font-medium">
        {{ $t({ en: 'Explore the User Tutorial', zh: '探索用户教程' }) }}
      </div>
      <div class="mt-7 text-[18px]/7">
        {{
          $t({
            en: 'Build coding skills and develop computational thinking with XBuilder',
            zh: '通过 XBuilder 提升编程技能，培养程序化思维'
          })
        }}
      </div>
    </div>
  </div>
</template>
