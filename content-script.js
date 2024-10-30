function startVKPlay() {
  let observerPlayer;
  let clearControl;

  // следит за изменениями враппера
  function observePlayerWrap() {
    const callback = function(mutationsList, observer) {
      for (let mutation of mutationsList) {
        if(!(mutation.target instanceof HTMLElement))
          continue

        for(let node of mutation.addedNodes) {
          if(node.id === 'mv_layer_wrap') {
            observePlayer()
            observer.disconnect()
          }
        }
      }
    }
    
    const observer = new MutationObserver(callback)
    observer.observe(document.body, { childList: true })
  }

  // когда player меняется, перезапускаем все события
  function observePlayer() {
    const callback = function(mutationsList, observer) {
      for(const mutation of mutationsList) {
        if(!(mutation.target instanceof HTMLElement))
          continue

        if(mutation.target.classList.contains('video_box_wrap')) {
          for(const node of mutation.addedNodes) {
            if(!(node instanceof HTMLElement))
              continue

            if(node.id === 'video_player') {
              clearControl = start(mutation.target.id)
            }
          }
        }
      }
    }
    
    observerPlayer = new MutationObserver(callback)
    observerPlayer.observe(document.getElementById('mv_layer_wrap'), { childList: true, subtree: true })
  }

  const player = document.getElementById('mv_layer_wrap')
  if(player) {
    observePlayer()
  } else {
    observePlayerWrap()
  }


  function start() {
    // очищаем предыдущие события
    if(typeof clearControl === 'function')
      clearControl()
    
    const playerBox = document.getElementById('video_player')
    if(!playerBox)
      return console.log('not playerbox', pb)

    const video = playerBox.querySelector('video')
    if(!video)
      return console.log("no video elem")

    const textSpeedElem = createSpeedViewElem()

    // Смена скорости при нажатии на цифры
    const keypress = (e) => {
      if(e.key >= 1 && e.key <= 9) {
        const speed = 0.25 * e.key
        video.playbackRate = speed
        
        if(speed === 1) {
          textSpeedElem.style.display = 'none'
        } else {
          textSpeedElem.style.display = ''
          textSpeedElem.textContent = speed + 'x'
        }
      } else if(e.key === '0') {
        video[video.paused ? 'play' : 'pause']()
      }
    }

    const mouseover = (e) => {
      document.addEventListener('keypress', keypress)
    }

    const mouseout = (e) => {
      document.removeEventListener('keypress', keypress)
    }

    playerBox.addEventListener('mouseover', mouseover)
    playerBox.addEventListener('mouseout', mouseout)

    // click 2x
    let mousedownTimeout;
    let saveSpeed = 1
    let isMousedown;
    let isSpeed2x = false

    // устанавливаем скорость x2
    playerBox.addEventListener('mousedown', () => {
      saveSpeed = video.playbackRate
      isMousedown = true

      mousedownTimeout = setTimeout(() => {
        video.playbackRate = 2
        textSpeedElem.textContent = '2x'
        textSpeedElem.style.display = ''
        isSpeed2x = true
      }, 500)
    })
  
    // отменяем x2 и устанавливаем предыдущую скорость
    window.addEventListener('mouseup', () => {
      if(isMousedown) {
        const video = playerBox.querySelector('video')
        if(!video)
          return console.log("no video elem")

        clearTimeout(mousedownTimeout)
        textSpeedElem.textContent = saveSpeed + 'x'
        if(saveSpeed === 1)
          textSpeedElem.style.display = 'none'

        video.playbackRate = saveSpeed
        if(isSpeed2x) {
          setTimeout(() => video.play(), 1)
          isSpeed2x = false
        }
        isMousedown = false
      }
    })

    // Показываем в верхнем углу текущую скорость, кроме x1
    function createSpeedViewElem() {
      const textSpeedClassName = '__custom-player-speed-value'
      if(document.querySelector(`.${textSpeedClassName}`)) {
        console.log("textSpeedElem already exists")
        return document.querySelector(`.${textSpeedClassName}`)
      }

      const box = document.createElement('div')
      box.style.cssText = 'position:relative;'
      const content = document.createElement('div')
      content.className = textSpeedClassName
      content.style.cssText = `
        display:none;
        position: absolute;
        padding: 5px;
        background-color: rgb(0 0 0 / 90%);
        color: rgba(255, 255, 255, 0.8);
        font-size: 14px;
        z-index: 2;
        border-bottom-right-radius: 6px;
      `
      box.append(content)
      playerBox.insertBefore(box, playerBox.children[0])

      return content
    }

    // для очистки событий, при смене плеера
    return () => {
      document.removeEventListener('keypress', keypress)
      
      if(playerBox) {
        playerBox.removeEventListener('mousedown', mousedownTimeout)
        playerBox.removeEventListener('mouseout', mouseout)
        playerBox.removeEventListener('mouseover', mouseover)
        console.log('clear')
      } else {
        console.log('clear fail')
      }
    }
  }
}

function startYoutubePlay() {
  function tryGetTimecodes() {
    let youtubeData;

    for(const script of document.querySelectorAll('script[nonce]')) {
      const text = script.textContent
      if(text.includes('ytInitialPlayerResponse =')) {
        const startPos = text.indexOf("{")
        let endPos;

        for(let i = text.length - 1; i >= 0; --i) {
          if(text[i] === "}") {
            endPos = i
            break
          }
        }

        if(startPos >= 0 && endPos) {
          try {
            youtubeData = JSON.parse(text.substring(startPos, endPos + 1))
          } catch(e) {
            console.log('error while parsing youtubeData')
          }
        }

        break
      }
    }
    // тайм-коды
    const data = youtubeData?.videoDetails?.shortDescription
    if(!data)
      return console.log('no youtube data', youtubeData)
    
    const [head, tail] = data.split("00:00")
    if(!tail)
      return console.log("no tail")

    const result = tail
      .split("\n")
      .filter(value => /^\d\d\:\d\d/.test(value))
      .map(value => value.replace(/^(\d\d\:[\d\:]+).*/, "$1"))

    const times = result.map(value => {
      const [seconds, minutes, hours] = value.split(":").reverse()
      return Number(seconds) + (Number(minutes) * 60) + (Number(hours || 0) * 60 * 60)
    })

    return times
  }

  const timeCodes = tryGetTimecodes()
  const video = document.querySelector('video')

  if(!video)
    return console.info("Browser plugin 'vk/youtube/rutube player speed': the youtube player is not found")
  
  const textSpeedElem = createSpeedViewElem()

  const ruSpeedKeys  = '!"№;%:?*(' // 1-9
  const engSpeedKeys = "!@#$%^&*(" // 1-9
  const stopPlayKey = ")"

  const keypress = (e) => {
    const pos = ruSpeedKeys.indexOf(e.key) + 1 || engSpeedKeys.indexOf(e.key) + 1
    if(e.shiftKey && pos) {
      const speed = 0.25 * pos
      video.playbackRate = speed
      
      if(speed === 1) {
        textSpeedElem.style.display = 'none'
      } else {
        textSpeedElem.style.display = ''
        textSpeedElem.textContent = speed + 'x'
      }
    } else if(e.shiftKey && e.key === stopPlayKey) {
      video[video.paused ? 'play' : 'pause']()
    } else if(e.shiftKey && (e.key === "~" || e.key === "Ё") && timeCodes) {
      const nextTimeCode = timeCodes.find(time => time >= video.currentTime)
      if(nextTimeCode)
        video.currentTime = nextTimeCode
    }
  }

  const mouseover = (e) => {
    document.addEventListener('keypress', keypress)
  }

  const mouseout = (e) => {
    document.removeEventListener('keypress', keypress)
  }
  
  let mousedownTimeout;
  let saveSpeed = 1
  let isMousedown;

  video.addEventListener('mousedown', () => {
    saveSpeed = video.playbackRate
    isMousedown = true
    mousedownTimeout = setTimeout(() => {
      textSpeedElem.textContent = '2x'
    }, 500)
  })

  window.addEventListener('mouseup', () => {
    if(isMousedown) {      
      clearTimeout(mousedownTimeout)
      textSpeedElem.textContent = saveSpeed + 'x'
      video.playbackRate = saveSpeed
      isMousedown = false
    }
  })

  video.addEventListener('mouseover', mouseover)
  video.addEventListener('mouseout', mouseout)

  function createSpeedViewElem() {
    const textSpeedClassName = '__custom-player-speed-value'

    if(document.querySelector(`.${textSpeedClassName}`)) {
      console.log("already exists")
      return document.querySelector(`.${textSpeedClassName}`)
    }

    const box = document.createElement('div')
    box.style.cssText = 'position:relative;'
    const content = document.createElement('div')
    content.className = textSpeedClassName
    content.style.cssText = `
      display:none;
      position: absolute;
      padding: 5px;
      background-color: rgb(0 0 0 / 90%);
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
      z-index: 20;
      border-bottom-right-radius: 6px;
    `
    box.append(content)
    const container = video.parentElement.parentElement
    container.insertBefore(box, container.children[0])
    return content
  }

  /*function observePlayerWrap() {
    const callback = function(mutationsList, observer) {
      console.log('start observe')
      for (let mutation of mutationsList) {
        if(!(mutation.target instanceof HTMLElement))
          continue

        if(mutation.type === 'attibute')
          console.log('cmutation', mutation.attributeName, mutation.oldValue)
      }
    }
    
    const observer = new MutationObserver(callback)
    observer.observe(video, { attributes: true, attributeOldValue: true, attributeFilter: ['src'] })
  }

  observePlayerWrap() */
}

function startTwitchPlay() {
  const video = document.querySelector('video')

  if(!video)
    return console.info("Browser plugin 'vk/youtube/rutube player speed': the youtube player is not found")
  
  const playerBox = document.querySelector('[data-a-target="player-overlay-click-handler"]')
  if(!playerBox)
    return console.info("Browser plugin 'vk/youtube/rutube player speed': playerBox is not found")
  
  const textSpeedElem = createSpeedViewElem()

  const keypress = (e) => {
    console.log("keypress")
    if(e.key >= 1 && e.key <= 9) {
      const speed = 0.25 * e.key
      video.playbackRate = speed
      
      if(speed === 1) {
        textSpeedElem.style.display = 'none'
      } else {
        textSpeedElem.style.display = ''
        textSpeedElem.textContent = speed + 'x'
      }
    } else if(e.key === '0') {
      video[video.paused ? 'play' : 'pause']()
    }
  }

  const mouseover = (e) => {
    document.addEventListener('keypress', keypress)
  }

  const mouseout = (e) => {
    document.removeEventListener('keypress', keypress)
  }
  
  let mousedownTimeout;
  let saveSpeed = 1
  let isMousedown;

  playerBox.addEventListener('mousedown', () => {
    saveSpeed = video.playbackRate
    isMousedown = true
    mousedownTimeout = setTimeout(() => {
      console.log('2x speed')
      video.playbackRate = 2
      textSpeedElem.textContent = '2x'
      textSpeedElem.style.display = ''
    }, 500)
  })

  window.addEventListener('mouseup', () => {
    if(isMousedown) {      
      clearTimeout(mousedownTimeout)
      textSpeedElem.textContent = saveSpeed + 'x'
      if(saveSpeed === 1)
        textSpeedElem.style.display = 'none'
      video.playbackRate = saveSpeed
      isMousedown = false
    }
  })

  video.parentElement.addEventListener('mouseover', mouseover)
  video.parentElement.addEventListener('mouseout', mouseout)

  function createSpeedViewElem() {
    const textSpeedClassName = '__custom-player-speed-value'

    if(document.querySelector(`.${textSpeedClassName}`)) {
      console.log("already exists")
      return document.querySelector(`.${textSpeedClassName}`)
    }

    const box = document.createElement('div')
    box.style.cssText = 'position:relative;'
    const content = document.createElement('div')
    content.className = textSpeedClassName
    content.style.cssText = `
      display:none;
      position: absolute;
      padding: 5px;
      background-color: rgb(0 0 0 / 90%);
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
      z-index: 20;
      border-bottom-right-radius: 6px;
    `
    box.append(content)
    const container = video.parentElement
    container.insertBefore(box, container.children[0])
    return content
  }
}


if(window.location.host.includes('vk.com')) {
  console.log('start vk player')
  startVKPlay()
}
else if(window.location.host.includes('youtube.com')) {
  const youtubeInterval = setInterval(() => {
    if(document.querySelector('video')) {
      console.log('start youtube player')
      clearInterval(youtubeInterval)
      startYoutubePlay()
    }
  }, 1000)
}
else if(window.location.host.includes('twitch.tv')) {
  const twitchInterval = setInterval(() => {
    if(document.querySelector("video")) {
      console.log('start twitch player')
      clearInterval(twitchInterval)
      startTwitchPlay()
    }
  }, 1000)
}
else if(window.location.host.includes('rutube.ru')) {
  console.log('start rutube player')
}
