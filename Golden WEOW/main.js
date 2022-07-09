(function() {
  const GOLDEN_WEOW_CHANCE = 1; // 1 in a 126 chance (or ~0.79%)
  const chatId = 'chat-win-main';
  const goldenWeowClass = 'voiture-golden-weow';
  let chat = document.getElementById(chatId);

  function createStyleElement() {
    const style = document.createElement('style');
    style.id = 'voiture-golden-weow-styles';
    style.innerHTML = `
    .${goldenWeowClass} {
      transition: filter 500ms ease-in-out;
      filter: contrast(1) sepia(0.1) saturate(22) drop-shadow(0px 0px 4px #ffe85f);
    }
    .${goldenWeowClass}:hover {
      filter: contrast(1) sepia(0.1) saturate(22) drop-shadow(0px 0px 13px #ffe85f);
    }
    `;
    return style;
  }

  function parseDate(str) {
    const timeStampStr = str
      .replace(/st|nd|rd|th|,/g, '')
      .replace(/:/g, ' ')
      .split(' ');
    // ['June', '13', '2022', '6', '31', '45', 'pm']
    const month  = timeStampStr[0];
    const day    = timeStampStr[1];
    const year   = timeStampStr[2];
    const hour   = parseInt(timeStampStr[3]) + (timeStampStr[6] === 'pm' && timeStampStr[3] < 12 ? 12 : 0);
    const minute = timeStampStr[4];
    const second = timeStampStr[5];
    const timeStamp = Date.parse(`${day} ${month} ${year} ${hour}:${minute}:${second}`) / 1000;
    return timeStamp;
  }

  /*
      cyrb53 (c) 2018 bryc (github.com/bryc)
      A fast and simple hash function with decent collision resistance.
      Largely inspired by MurmurHash2/3, but with a focus on speed/simplicity.
      Public domain. Attribution appreciated.
  */
  function cyrb53(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
    h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1>>>0);
  }

  function getMessageHash(messageElem) {
    const time = messageElem.querySelector('.time').getAttribute('title');
    const username = messageElem.dataset.username;
    const message = messageElem.querySelector('.text').innerText;

    const timeStamp = parseDate(time);
    const hash = cyrb53(username + timeStamp + message);
    return hash;
  }

  function isGoldenWeow(hash) {
    return hash % GOLDEN_WEOW_CHANCE === 0;
  }

  function goldenWeowHandler(messageElem, weows) {
    if (weows.length === 1 && isGoldenWeow(getMessageHash(messageElem))) {
      weows[0].classList.add(goldenWeowClass);
      // console.log('Golden WEOW detected!', messageElem, weows[0]);
    }
  }

  function messageAddedHandler(message) {
    if (!message.classList.contains('msg-user')) return;
    const weows = message.querySelectorAll('.text > .emote.WEOW');
    if (weows.length === 0) return; // Spamming multiple weows will not allow any to be golden
    if (blacklistedUsers.includes(message.dataset.username)) return; // This is why we can't have nice things

    goldenWeowHandler(message, weows);
  }

  // Cheated Golden Weows taste awful
  const blacklistedUsers = [
    'kogasa',
    'dennisfish',
    'goldenweow',
    // 'wazup12', // On Probation
  ];
  const weowObserveFunction = function (mutations) {
    for (let i = 0; i < mutations.length; i++) {
      for (let j = 0; j < mutations[i].addedNodes.length; j++) {
        // Get new message
        messageAddedHandler(mutations[i].addedNodes[j]);
      }
    }
  };

  // Create observers
  const weowObserver = new MutationObserver(weowObserveFunction);

  // Look for messages where we have been emoted at
  function observeChat() {
    const chatLines = chat.querySelector('.chat-lines');
    // Observe chat
    weowObserver.observe(chatLines, {
      attributes: true,
      childList: true,
      characterData: true,
    });
  }

  function injectStyles(doc) {
    doc.head.appendChild(createStyleElement());
  }
  function loadChatFromBigScreen(iframe) {
    const newChat = iframe.contentDocument.getElementById(chatId);
    const isNew = chat !== newChat;
    chat = newChat;
    return isNew;
  }
  function loadChatFromEmbedChat() {
    chat = document.getElementById(chatId);
  }

  /******************************************/
  /* Main Code To Run ***********************/
  /******************************************/

  function main() {
    // If on BigScreen, it might not have loaded yet, find iframe and wait for load
    const iframe = document
      .getElementById('chat-wrap')
      ?.querySelector('iframe');
    if (iframe != null) {
      // on /BigScreen
      iframe.addEventListener('load', e => {
        if (loadChatFromBigScreen(iframe)) {
          observeChat();
          injectStyles(iframe.contentDocument);
        }
      });
      loadChatFromBigScreen(iframe);
      injectStyles(iframe.contentDocument);
    } else {
      // on /embed/chat
      loadChatFromEmbedChat();
      injectStyles(document);
    }
    if (chat == null) return; // Probably not on /bigscreen or /embed/chat, or not loaded yet on bigscreen
    observeChat();
  }

  main();
})();