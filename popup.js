async function start() {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  chrome.scripting.executeScript({
    // скрипт будет выполняться во вкладке, которую нашли на предыдущем этапе
    target: { tabId: tab.id },
    function: initControl,
  })
}

function initControl() {
  const cnElemContent = '__custom-player-speed-value'
  
  if(document.querySelector(`.${cnElemContent}`))
    return console.log("already exists")

  const playerBox = document.getElementById('video_player')
  
  const keypress = (e) => {
    const video = playerBox.querySelector('video')
    if(!video)
      console.log("no video elem")
  
    if(e.key >= 1 && e.key <= 9) {
      const speed = 0.25 * e.key
      video.playbackRate = speed
      const elem = document.querySelector(`.${cnElemContent}`)
      if(!elem)
        return
      
      if(speed === 1) {
        elem.style.display = 'none'
      } else {
        elem.style.display = ''
        elem.textContent = speed + 'x'
      }
    } else if(e.key === '0') {
      video[video.paused ? 'play' : 'pause']()
    }
  }
  
  const mouseover = (e) => {
    document.addEventListener('keypress', keypress)
  }
  
  playerBox.addEventListener('mouseover', mouseover)
  
  playerBox.addEventListener('mouseout', () => {
    document.removeEventListener('keypress', keypress)
  })
  
  function createSpeedViewElem() {
    const box = document.createElement('div')
    box.style.cssText = 'position:relative;'
    const content = document.createElement('div')
    content.className = cnElemContent
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
  }
  
  createSpeedViewElem()
};


;(async () => {
  await start()
})();