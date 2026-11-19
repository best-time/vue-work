<template>
  <div>
    <div>
      {{ a }}
    </div>
    <div>{{ b.age }}</div>
    <AC />
    <div>
      <svg viewBox="25 25 50 50" class="circular">
        <circle
          cx="50"
          cy="50"
          r="20"
          fill="none"
          class="path"
          stroke-dasharray="90 150"
        ></circle>
      </svg>
    </div>

    <div v-loading="loading" element-loading-spinner="svg-ring-spinner"></div>
    <infi-scroll></infi-scroll>
  </div>
</template>

<script>
import AC from "./AC.vue";
import InfiScroll from "./scroll.vue";
export default {
  components: {
    AC,
    InfiScroll,
  },
  data() {
    return {
      loading: true,
      a: 1,
      b: {
        age: 22,
      },
    };
  },
};
</script>

<style lang="scss">
.circular {
  height: 40px;
  width: 40px;
  animation: loading-rotate 2s linear infinite;
}
.path {
  animation: loading-dash 1.5s ease-in-out infinite;
  stroke-dasharray: 90, 150;
  stroke-dashoffset: 0;
  stroke-width: 3;
  stroke: #409eff;
  stroke-linecap: round;
}

/* 圆弧旋转 */
.svg-ring-spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 50 50'><circle cx='25' cy='25' r='20' fill='none' stroke='%23409EFF' stroke-width='3' stroke-dasharray='90 36' stroke-linecap='round'/></svg>");
  background-size: 100% 100%;
  background-repeat: no-repeat;
  animation: svg-spin 1s linear infinite;
}

@keyframes svg-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes loading-rotate {
  100% {
    transform: rotate(1turn);
  }
}
@keyframes loading-dash {
  0% {
    stroke-dasharray: 1, 200;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -40px;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -120px;
  }
}
</style>
