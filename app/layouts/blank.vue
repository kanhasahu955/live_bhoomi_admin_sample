<template>
  <div class="relative min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8">
    <AppBackgroundBlur />
    <div class="relative z-10 flex w-full flex-col items-center">
      <slot />
    </div>
  </div>
</template>
