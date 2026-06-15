<script setup lang="ts">
import { computed } from 'vue'
import type { PlantSlot } from '@/types/game'

interface StatItem {
  label: string
  value: number
  max: number
  icon: string
  color: string
  barColor: string
  isReverse?: boolean
}

interface Props {
  health: number
  hunger: number
  thirst: number
  wood: number
  stone: number
  plots: PlantSlot[]
  currentTurn: number
}

const props = defineProps<Props>()

const stats = computed<StatItem[]>(() => [
  {
    label: '生命值',
    value: props.health,
    max: 100,
    icon: '❤️',
    color: 'text-red-400',
    barColor: 'bg-red-500',
  },
  {
    label: '饥饿值',
    value: props.hunger,
    max: 100,
    icon: '🍖',
    color: 'text-orange-400',
    barColor: 'bg-orange-500',
    isReverse: true,
  },
  {
    label: '口渴值',
    value: props.thirst,
    max: 100,
    icon: '💧',
    color: 'text-blue-400',
    barColor: 'bg-blue-500',
    isReverse: true,
  },
  {
    label: '木材',
    value: props.wood,
    max: 100,
    icon: '🪵',
    color: 'text-amber-600',
    barColor: 'bg-amber-600',
  },
  {
    label: '石头',
    value: props.stone,
    max: 100,
    icon: '🪨',
    color: 'text-gray-400',
    barColor: 'bg-gray-400',
  },
])

function getBarWidth(value: number, max: number): string {
  const percent = Math.max(0, Math.min(100, (value / max) * 100))
  return `${percent}%`
}

function isDanger(value: number, max: number, isReverse?: boolean): boolean {
  const percent = (value / max) * 100
  if (isReverse) {
    return percent >= 80
  }
  return percent <= 20
}

function getPlotStatusText(plot: PlantSlot): string {
  if (plot.status === 'empty') return '空闲'
  if (plot.status === 'mature') return '已成熟'
  const elapsed = props.currentTurn - plot.plantedTurn
  const remaining = Math.max(0, plot.maturesIn - elapsed)
  return `生长中 (${remaining}回合)`
}

function getPlotIcon(plot: PlantSlot): string {
  if (plot.status === 'empty') return '🕳️'
  if (plot.status === 'mature') return '🌾'
  return '🌱'
}

function getPlotColor(plot: PlantSlot): string {
  if (plot.status === 'empty') return 'text-gray-500'
  if (plot.status === 'mature') return 'text-yellow-400'
  return 'text-green-400'
}

function getGrowthPercent(plot: PlantSlot): number {
  if (plot.status === 'empty') return 0
  if (plot.status === 'mature') return 100
  const elapsed = props.currentTurn - plot.plantedTurn
  return Math.min(100, Math.round((elapsed / plot.maturesIn) * 100))
}
</script>

<template>
  <div class="bg-game-card rounded-2xl p-6 border border-game-border shadow-xl">
    <h2 class="text-xl font-bold text-white mb-5 flex items-center gap-2">
      <span>📊</span>
      <span>生存状态</span>
    </h2>
    <div class="space-y-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="group"
      >
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2">
            <span class="text-lg">{{ stat.icon }}</span>
            <span :class="[stat.color, 'font-medium text-sm']">{{ stat.label }}</span>
          </div>
          <span
            :class="[
              stat.color,
              'font-bold text-sm tabular-nums',
              isDanger(stat.value, stat.max, stat.isReverse) ? 'animate-pulse-soft' : '',
            ]"
          >
            {{ Math.round(stat.value) }}
          </span>
        </div>
        <div class="h-2.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            :class="[stat.barColor, 'h-full rounded-full transition-all duration-300 ease-out']"
            :style="{ width: getBarWidth(stat.value, stat.max) }"
          ></div>
        </div>
      </div>
    </div>

    <div class="mt-5 pt-4 border-t border-game-border">
      <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <span>🌾</span>
        <span>种植区</span>
      </h3>
      <div class="space-y-2">
        <div
          v-for="(plot, index) in plots"
          :key="index"
          class="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2"
        >
          <span class="text-lg">{{ getPlotIcon(plot) }}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <span :class="[getPlotColor(plot), 'text-xs font-medium']">地块 {{ index + 1 }}</span>
              <span :class="[getPlotColor(plot), 'text-xs']">{{ getPlotStatusText(plot) }}</span>
            </div>
            <div v-if="plot.status !== 'empty'" class="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                :class="[
                  plot.status === 'mature' ? 'bg-yellow-400' : 'bg-green-500',
                  'h-full rounded-full transition-all duration-300 ease-out',
                ]"
                :style="{ width: getGrowthPercent(plot) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
