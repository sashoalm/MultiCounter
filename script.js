const itemCount = 50;
const itemsContainer = document.querySelector('.items');
const baseItem = itemsContainer.querySelector('.item');
let filterTimeout = null; // Declared globally to fix reference errors in filtering

// 1. Initialize and build the DOM from LocalStorage
let localData = [];
try {
    localData = JSON.parse(localStorage.getItem('item_data_en')) || [];
} catch (e) {
    console.error("Failed to parse local storage data", e);
}

for (let i = 0; i < itemCount; i++) {
    let temp_item = (i === 0) ? baseItem : baseItem.cloneNode(true);
    if (i > 0) itemsContainer.append(temp_item);

    // Setup basic placeholders
    const input = temp_item.querySelector('.item_title input');
    input.setAttribute('placeholder', 'Counter ' + (i + 1));

    // Populate saved data if it exists
    const saved = localData[i];
    if (saved) {
        input.value = saved.title || '';
        temp_item.querySelector('.item_timestamp').textContent = saved.timestamp || '';
    }
}

let lastLoadedTimestamp = null;
setInterval(() => {
    // 1. Initialize and build the DOM from LocalStorage
    let localData = [];
    try {
        localData = JSON.parse(localStorage.getItem('item_data_en')) || [];
    } catch (e) {
        console.error("Failed to parse local storage data", e);
    }

    if (!localData.lastModifiedTimestamp) {
        localData = { 'items': localData };
    }

    if (!lastLoadedTimestamp || localData.lastModifiedTimestamp && localData.lastModifiedTimestamp > lastLoadedTimestamp) {
        lastLoadedTimestamp = Date.now();

        const items = document.querySelectorAll('.item');
        for (let i = 0; i < itemCount; i++) {
            // Setup basic placeholders
            const input = items[i].querySelector('.item_title');

            // Populate saved data if it exists
            const saved = localData.items[i];
            if (saved) {
                input.value = saved.title || '';
                items[i].querySelector('.item_timestamp').textContent = saved.timestamp || '';
            }
        }
    }
}, 1000);

// 2. Parent Event Listeners (Event Delegation)
itemsContainer.addEventListener('change', function(event) {
    if (event.target.matches('.item_title input')) {
        syncData();
    }
});

itemsContainer.addEventListener('click', function(event) {
    const target = event.target;
    const itemEl = target.closest('.item');
    if (!itemEl) return;

    if (target.matches('.btn_reset')) {
        resetCount(itemEl);
    } else if (target.matches('.btn_minus')) {
        countDown(itemEl);
    } else if (target.matches('.btn_plus')) {
        countUp(itemEl);
    }
});

// 3. Action Handlers (Operating directly on the DOM Element)
function resetCount(itemEl) {
    const input = itemEl.querySelector('.item_title input');
    
    // Captures "(baseTitle) - (count)" OR just a standalone "(count)"
    const match = input.value.match(/^(.*?)(?:\s-\s|\s*)\d+$/);
    
    input.value = match ? match[1] : '';
    itemEl.querySelector('.item_timestamp').textContent = '';
    syncData();
}

function countDown(itemEl) {
    const input = itemEl.querySelector('.item_title input');
    
    // Group 1: Optional base title. Group 2: The count digits.
    const match = input.value.match(/^(?:(.*)\s-\s)?(\d+)$/);
    
    if (match) {
        const baseTitle = match[1]; // undefined if there was no " - "
        const currentCount = parseInt(match[2], 10);
        const newCount = currentCount - 1;
        
        if (newCount > 0) {
            input.value = baseTitle ? `${baseTitle} - ${newCount}` : `${newCount}`;
            itemEl.querySelector('.item_timestamp').textContent = getTimestamp();
        } else {
            input.value = baseTitle || '';
            itemEl.querySelector('.item_timestamp').textContent = '';
        }
        
        syncData();
    }
}

function countUp(itemEl) {
    const input = itemEl.querySelector('.item_title input');
    
    // Group 1: Optional base title. Group 2: The count digits.
    const match = input.value.match(/^(?:(.*)\s-\s)?(\d+)$/);
    
    if (match) {
        const baseTitle = match[1];
        const currentCount = parseInt(match[2], 10);
        
        input.value = baseTitle ? `${baseTitle} - ${currentCount + 1}` : `${currentCount + 1}`;
    } else {
        // If the field is totally empty, make it "1" (No dash prefix!)
        input.value = input.value ? `${input.value} - 1` : '1';
    }
    itemEl.querySelector('.item_timestamp').textContent = getTimestamp();
    syncData();
    debounce(sortMostRecent, 10000);
}

function getTimestamp() {
    const now = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ` +
           `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// 4. Read directly from the DOM and save to LocalStorage
function syncData() {
    const allItems = itemsContainer.querySelectorAll('.item');
    const items = Array.from(allItems).map(itemEl => {
        const title = itemEl.querySelector('.item_title input').value;
        const timestamp = itemEl.querySelector('.item_timestamp').textContent;
        return { title, timestamp }; 
    });
    const dataToSave = { 'items': items, lastModifiedTimestamp: Date.now() };

    localStorage.setItem('item_data_en', JSON.stringify(dataToSave));
}

// --- Text Filter Implementation ---
function addFilterField() {
  const itemsContainer = document.querySelector('.items');
  if (!itemsContainer) return;

  const filterContainer = document.createElement('div');
  filterContainer.className = 'filter_container';
  filterContainer.style.cssText = 'margin-bottom: 15px; width: 100%;';

  const filterInput = document.createElement('input');
  filterInput.type = 'text';
  filterInput.placeholder = 'Filter counters...';
  filterInput.className = 'filter_input';
  filterInput.style.cssText = 'width: 100%; padding: 8px; box-sizing: border-box;';

  filterContainer.appendChild(filterInput);
  itemsContainer.parentNode.insertBefore(filterContainer, itemsContainer);

  const items = itemsContainer.querySelectorAll('.item');

  filterInput.addEventListener('input', () => {
    const query = filterInput.value.toLowerCase().trim();

    items.forEach(item => {
      const titleInput = item.querySelector('.item_title input');
      const titleText = titleInput ? titleInput.value.toLowerCase() : '';
      
      if (titleText.includes(query)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });

    if (filterTimeout) clearTimeout(filterTimeout);

    if (query !== '') {
      filterTimeout = setTimeout(() => {
        filterInput.value = '';
        items.forEach(item => item.style.display = '');
      }, 10000);
    }
  });
}

addFilterField();

function sortMostRecent() {
    const items = document.querySelectorAll('.items .item');
    const limit = Math.min(items.length, 45);

    let portionData = [];
    for (let i = 0; i < limit; i++) {
        const item = items[i];
        portionData.push({
            title: item.querySelector('.item_title input').value,
            timestamp: item.querySelector('.item_timestamp').textContent.trim(),
            originalIndex: i 
        });
    }

    const sortedPortion = [...portionData].sort((a, b) => {
        if (!a.timestamp && b.timestamp) return 1;
        if (a.timestamp && !b.timestamp) return -1;

        if (!a.title && b.title) return 1;
        if (a.title && !b.title) return -1;

        const timeCompare = b.timestamp.localeCompare(a.timestamp);
        
        if (timeCompare === 0) {
            return a.originalIndex - b.originalIndex;
        }
        
        return timeCompare;
    });

    const orderHasChanged = sortedPortion.some((item, index) => item.originalIndex !== portionData[index].originalIndex);

    if (!orderHasChanged) {
        console.log("Items are already perfectly sorted. Skipping reload.");
        return; 
    }

    for (let i = 0; i < limit; i++) {
        const item = items[i];
        item.querySelector('.item_title input').value = sortedPortion[i].title;
        item.querySelector('.item_timestamp').textContent = sortedPortion[i].timestamp;
    }

    syncData();
}

function debounce(fn, ms) {
    let timeoutId = null;
    const activityEvents = ['click', 'input', 'change', 'keydown'];

    function handleUserActivity() {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            cleanup();
            fn();
        }, ms);
    }

    function cleanup() {
        activityEvents.forEach(eventType => {
            window.removeEventListener(eventType, handleUserActivity);
        });
    }

    activityEvents.forEach(eventType => {
        window.addEventListener(eventType, handleUserActivity, { passive: true });
    });
}
