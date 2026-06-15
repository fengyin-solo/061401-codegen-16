import { ref, computed, watch } from 'vue'
import type { GameState, LogEntry, RandomEvent, ActionType, ActionEffect, PlantSlot } from '@/types/game'
import { randomEvents } from '@/data/events'

const STORAGE_KEY_HIGH_SCORE = 'survival_game_high_score'
const MAX_STAT = 100
const MAX_PLOTS = 3
const PLANT_MATURITY_TURNS = 3

const actionEffects: Record<ActionType, ActionEffect> = {
  gatherWood: {
    health: -5, hunger: 5, thirst: 3, wood: 10, stone: 0 },
  gatherStone: {
    health: -8, hunger: 6, thirst: 4, wood: 0, stone: 8 },
  hunt: {
    health: 15, hunger: -20, thirst: 5, wood: -5, stone: 0 },
  drink: {
    health: 0, hunger: 2, thirst: -25, wood: -3, stone: 0 },
  plant: {
    health: 0, hunger: 3, thirst: 2, wood: -2, stone: 0 },
  harvest: {
    health: 0, hunger: -25, thirst: 0, wood: 0, stone: 0 },
}

const actionNames: Record<ActionType, string> = {
  gatherWood: '采集木头',
  gatherStone: '采集石头',
  hunt: '打猎',
  drink: '喝水',
  plant: '播种',
  harvest: '收成',
}

export function useGame() {
  const state = ref<GameState>({
    health: 80,
    hunger: 30,
    thirst: 30,
    wood: 10,
    stone: 5,
    turn: 0,
    isGameOver: false,
    logs: [],
    plots: [
      { status: 'empty', plantedTurn: 0, maturesIn: 0 },
      { status: 'empty', plantedTurn: 0, maturesIn: 0 },
      { status: 'empty', plantedTurn: 0, maturesIn: 0 },
    ],
  })

  const highScore = ref<number>(0)
  let logIdCounter = 0

  const canAct = computed(() => !state.value.isGameOver)

  function loadHighScore() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HIGH_SCORE)
      if (saved) {
        highScore.value = parseInt(saved, 10) || 0
      }
    } catch (e) {
      highScore.value = 0
    }
  }

  function saveHighScore() {
    if (state.value.turn > highScore.value) {
      highScore.value = state.value.turn
      try {
        localStorage.setItem(STORAGE_KEY_HIGH_SCORE, String(highScore.value))
      } catch (e) {
        // ignore
      }
    }
  }

  function addLog(text: string, type: LogEntry['type'] = 'action') {
    state.value.logs.unshift({
      id: ++logIdCounter,
      text,
      type,
      turn: state.value.turn,
    })
    if (state.value.logs.length > 50) {
      state.value.logs.pop()
    }
  }

  function clampStat(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  function applyEffects(effects: ActionEffect) {
    if (effects.health !== undefined) {
      state.value.health = clampStat(state.value.health + effects.health, 0, MAX_STAT)
    }
    if (effects.hunger !== undefined) {
      state.value.hunger = clampStat(state.value.hunger + effects.hunger, 0, MAX_STAT)
    }
    if (effects.thirst !== undefined) {
      state.value.thirst = clampStat(state.value.thirst + effects.thirst, 0, MAX_STAT)
    }
    if (effects.wood !== undefined) {
      state.value.wood = Math.max(0, state.value.wood + effects.wood)
    }
    if (effects.stone !== undefined) {
      state.value.stone = Math.max(0, state.value.stone + effects.stone)
    }
  }

  function getRandomEvent(): RandomEvent {
    const index = Math.floor(Math.random() * randomEvents.length)
    return randomEvents[index]
  }

  function checkGameOver() {
    if (state.value.health <= 0 || state.value.hunger >= MAX_STAT || state.value.thirst >= MAX_STAT) {
      state.value.isGameOver = true
      saveHighScore()
      addLog('你没能在荒野中生存下来...', 'system')
    }
  }

  function advancePlots() {
    for (const plot of state.value.plots) {
      if (plot.status === 'growing') {
        const elapsed = state.value.turn - plot.plantedTurn
        if (elapsed >= plot.maturesIn) {
          plot.status = 'mature'
          addLog('🌾 你的作物已经成熟，可以收成了！', 'good')
        } else {
          const remaining = plot.maturesIn - elapsed
          addLog(`🌱 作物生长中，还需 ${remaining} 回合成熟`, 'event')
        }
      }
    }
  }

  function hasEmptyPlot(): boolean {
    return state.value.plots.some(p => p.status === 'empty')
  }

  function hasMaturePlot(): boolean {
    return state.value.plots.some(p => p.status === 'mature')
  }

  function hasGrowingPlot(): boolean {
    return state.value.plots.some(p => p.status === 'growing')
  }

  function applyPlantingEventEffects(event: RandomEvent) {
    if (!hasGrowingPlot() && !hasMaturePlot()) return

    if (event.id === 'pest_infestation') {
      const growingPlots = state.value.plots.filter(p => p.status === 'growing')
      if (growingPlots.length > 0) {
        const target = growingPlots[Math.floor(Math.random() * growingPlots.length)]
        target.status = 'empty'
        target.plantedTurn = 0
        target.maturesIn = 0
        addLog('🐛 虫害毁掉了一株正在生长的作物！', 'bad')
      }
    } else if (event.id === 'wild_boar_raids') {
      const alivePlots = state.value.plots.filter(p => p.status === 'growing' || p.status === 'mature')
      if (alivePlots.length > 0) {
        const target = alivePlots[Math.floor(Math.random() * alivePlots.length)]
        target.status = 'empty'
        target.plantedTurn = 0
        target.maturesIn = 0
        addLog('🐗 野猪毁坏了你的庄稼！', 'bad')
      }
    } else if (event.id === 'rain_nourish') {
      for (const plot of state.value.plots) {
        if (plot.status === 'growing' && plot.maturesIn > 1) {
          plot.maturesIn -= 1
          addLog('🌧️ 雨水加速了作物生长！', 'good')
        }
      }
    } else if (event.id === 'bumper_harvest') {
      for (const plot of state.value.plots) {
        if (plot.status === 'growing') {
          plot.maturesIn = Math.max(1, plot.maturesIn - 1)
        }
      }
    }
  }

  function canPerformAction(action: ActionType): boolean {
    if (state.value.isGameOver) return false
    if (action === 'plant') {
      return hasEmptyPlot() && state.value.wood >= 2
    }
    if (action === 'harvest') {
      return hasMaturePlot()
    }
    const effects = actionEffects[action]
    if (effects.wood !== undefined && state.value.wood + effects.wood < 0) {
      return false
    }
    if (effects.stone !== undefined && state.value.stone + effects.stone < 0) {
      return false
    }
    return true
  }

  function performAction(action: ActionType) {
    if (!canPerformAction(action)) return

    if (action === 'plant') {
      doPlant()
      return
    }
    if (action === 'harvest') {
      doHarvest()
      return
    }

    const effects = actionEffects[action]
    applyEffects(effects)
    state.value.turn++

    addLog(`第 ${state.value.turn} 回合：${actionNames[action]}`, 'action')

    advancePlots()

    const event = getRandomEvent()
    applyEffects(event.effects)
    applyPlantingEventEffects(event)

    const eventLogType = event.type === 'good' ? 'good' : event.type === 'bad' ? 'bad' : 'event'
    addLog(event.text, eventLogType)

    checkGameOver()
  }

  function doPlant() {
    const emptyIndex = state.value.plots.findIndex(p => p.status === 'empty')
    if (emptyIndex === -1) return

    state.value.wood = Math.max(0, state.value.wood - 2)
    state.value.hunger = clampStat(state.value.hunger + 3, 0, MAX_STAT)
    state.value.thirst = clampStat(state.value.thirst + 2, 0, MAX_STAT)
    state.value.turn++

    state.value.plots[emptyIndex] = {
      status: 'growing',
      plantedTurn: state.value.turn,
      maturesIn: PLANT_MATURITY_TURNS,
    }

    addLog(`第 ${state.value.turn} 回合：播种（消耗2木材，作物将在 ${PLANT_MATURITY_TURNS} 回合后成熟）`, 'action')

    advancePlots()

    const event = getRandomEvent()
    applyEffects(event.effects)
    applyPlantingEventEffects(event)

    const eventLogType = event.type === 'good' ? 'good' : event.type === 'bad' ? 'bad' : 'event'
    addLog(event.text, eventLogType)

    checkGameOver()
  }

  function doHarvest() {
    const matureIndex = state.value.plots.findIndex(p => p.status === 'mature')
    if (matureIndex === -1) return

    state.value.hunger = clampStat(state.value.hunger - 25, 0, MAX_STAT)
    state.value.turn++

    state.value.plots[matureIndex] = {
      status: 'empty',
      plantedTurn: 0,
      maturesIn: 0,
    }

    addLog(`第 ${state.value.turn} 回合：收成！获得了大量食物，饥饿值大幅降低 🌾`, 'good')

    advancePlots()

    const bonusChance = Math.random()
    if (bonusChance < 0.3) {
      state.value.hunger = clampStat(state.value.hunger - 10, 0, MAX_STAT)
      addLog('🍀 大丰收！额外获得了食物补给！', 'good')
    }

    const event = getRandomEvent()
    applyEffects(event.effects)
    applyPlantingEventEffects(event)

    const eventLogType = event.type === 'good' ? 'good' : event.type === 'bad' ? 'bad' : 'event'
    addLog(event.text, eventLogType)

    checkGameOver()
  }

  function gatherWood() {
    performAction('gatherWood')
  }

  function gatherStone() {
    performAction('gatherStone')
  }

  function hunt() {
    performAction('hunt')
  }

  function drink() {
    performAction('drink')
  }

  function plant() {
    performAction('plant')
  }

  function harvest() {
    performAction('harvest')
  }

  function restart() {
    state.value = {
      health: 80,
      hunger: 30,
      thirst: 30,
      wood: 10,
      stone: 5,
      turn: 0,
      isGameOver: false,
      logs: [],
      plots: [
        { status: 'empty', plantedTurn: 0, maturesIn: 0 },
        { status: 'empty', plantedTurn: 0, maturesIn: 0 },
        { status: 'empty', plantedTurn: 0, maturesIn: 0 },
      ],
    }
    logIdCounter = 0
    addLog('你醒来发现自己身处荒野中，需要想办法生存下去...', 'system')
  }

  loadHighScore()
  addLog('你醒来发现自己身处荒野中，需要想办法生存下去...', 'system')

  return {
    state,
    highScore,
    canAct,
    canPerformAction,
    gatherWood,
    gatherStone,
    hunt,
    drink,
    plant,
    harvest,
    hasEmptyPlot,
    hasMaturePlot,
    hasGrowingPlot,
    restart,
  }
}
