async function main() {
    syncData();
    sortMostRecent();
    addFilterField();
}

const itemCount = 50;
let filterTimeout = null; // Declared globally to fix reference errors in filtering

function struct(title, count, timestamp, item) {
    this.title = title;
    this.count = count;
    this.timestamp = timestamp;
    this.item = item;
}

// 1. Initialize and build the DOM from LocalStorage
let data = [];
let localData = [];
try {
    localData = JSON.parse(localStorage.getItem('item_data_en')) || [];
} catch (e) {
    console.error("Failed to parse local storage data", e);
}

const itemsContainer = document.querySelector('.items');
const baseItem = itemsContainer.querySelector('.item');

for (let i = 0; i < itemCount; i++) {
    const saved = localData[i] || {};
    data[i] = new struct(saved.title || '', saved.count || 0, saved.timestamp || '', null);

    let temp_item = (i === 0) ? baseItem : baseItem.cloneNode(true);
    if (i > 0) itemsContainer.append(temp_item);

    // Track the index on the element itself
    temp_item.dataset.index = i;

    // Setup basic placeholders
    const input = temp_item.querySelector('.item_title input');
    if (input) input.setAttribute('placeholder', 'Counter ' + (i + 1));

    data[i].item = temp_item;
}

document.addEventListener('DOMContentLoaded', function() {
    // Synchronize data if localStorage has newer timestamps than rendered DOM
    let freshLocalData = [];
    try {
        freshLocalData = JSON.parse(localStorage.getItem('item_data_en')) || [];
    } catch (e) {
        console.error("Failed to parse local storage data", e);
    }

    if (getMaxTimestamp(freshLocalData) > getMaxTimestampFromDOM()) {
        for (let i = 0; i < data.length; i++) {
            const saved = freshLocalData[i];
            if (saved) {
                data[i].title = saved.title || '';
                data[i].count = saved.count || 0;
                data[i].timestamp = saved.timestamp || '';
            }
        }
        syncData();
    }
});

// 2. Parent Event Listeners (Event Delegation)
itemsContainer.addEventListener('change', function(event) {
    if (event.target.matches('.item_title input')) {
        const itemEl = event.target.closest('.item');
        if (itemEl) {
            const index = parseInt(itemEl.dataset.index, 10);
            changeTitle(index, event.target.value);
        }
    }
});

itemsContainer.addEventListener('click', function(event) {
    const target = event.target;
    const itemEl = target.closest('.item');
    if (!itemEl) return;

    const index = parseInt(itemEl.dataset.index, 10);

    if (target.matches('.btn_reset')) {
        resetCount(index);
    } else if (target.matches('.btn_minus')) {
        countDown(index);
    } else if (target.matches('.btn_plus')) {
        countUp(index);
    }
});

function getMaxTimestamp(localData) {
    let maxTimestamp = null;
    for (let i = 0; i < localData.length; i++) {
        const element = localData[i];

        if (element && element.timestamp) {
            // Convert to a Date object or number to ensure accurate comparison
            const currentTimestamp = new Date(element.timestamp).getTime();

            if (maxTimestamp === null || currentTimestamp > maxTimestamp) {
                maxTimestamp = currentTimestamp;
            }
        }
    }
    return maxTimestamp;
}

function getMaxTimestampFromDOM() {
    const timestampElements = document.querySelectorAll('.items .item_timestamp');
    
    let maxTimeValue = 0;

    timestampElements.forEach(el => {
        const text = el.textContent.trim();
        if (text) {
            const timeValue = Date.parse(text);
            if (!isNaN(timeValue) && timeValue > maxTimeValue) {
                maxTimeValue = timeValue;
            }
        }
    });

    return maxTimeValue;
}

// 3. Action Handlers (Updating state object)
function changeTitle(index, value) {
    data[index].title = value;
    syncData();
}

function resetCount(index) {
    let currentTitle = data[index].title || '';
    
    // Captures "(baseTitle) - (count)" OR just a standalone "(count)"
    const match = currentTitle.match(/^(.*?)(?:\s-\s|\s*)\d+$/);

    data[index].title = match ? match[1] : '';
    data[index].count = 0;
    data[index].timestamp = '';
    syncData();
}

function countDown(index) {
    let currentTitle = data[index].title || '';
    
    // Group 1: Optional base title. Group 2: The count digits.
    const match = currentTitle.match(/^(?:(.*)\s-\s)?(\d+)$/);

    if (match) {
        const baseTitle = match[1]; // undefined if there was no " - "
        const currentCount = parseInt(match[2], 10);
        const newCount = currentCount - 1;

        if (newCount > 0) {
            data[index].title = baseTitle ? `${baseTitle} - ${newCount}` : `${newCount}`;
            data[index].count = newCount;
            data[index].timestamp = getTimestamp();
        } else {
            data[index].title = baseTitle || '';
            data[index].count = 0;
            data[index].timestamp = '';
        }

        syncData();
    }
}

function countUp(index) {
    let currentTitle = data[index].title || '';
    
    // Group 1: Optional base title. Group 2: The count digits.
    const match = currentTitle.match(/^(?:(.*)\s-\s)?(\d+)$/);

    if (match) {
        const baseTitle = match[1];
        const currentCount = parseInt(match[2], 10);
        const newCount = currentCount + 1;

        data[index].title = baseTitle ? `${baseTitle} - ${newCount}` : `${newCount}`;
        data[index].count = newCount;
    } else {
        // If the field is totally empty, make it "1" (No dash prefix!)
        data[index].title = currentTitle ? `${currentTitle} - 1` : '1';
        data[index].count = 1;
    }

    data[index].timestamp = getTimestamp();
    syncData();
    debounce(sortMostRecent, 1000);
}

function getTimestamp() {
    const now = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ` +
           `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// 4. Sync State to DOM and LocalStorage
function syncData() {
    for (let i = 0; i < data.length; i++) {
        if (!data[i].item) continue;
        const input = data[i].item.querySelector('.item_title input');
        if (input) input.value = data[i].title;
        data[i].item.querySelector('.item_timestamp').textContent = data[i].timestamp;
    }

    const dataToSave = data.map(item => ({
        title: item.title,
        count: item.count,
        timestamp: item.timestamp
    }));

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

    filterInput.addEventListener('input', () => {
        const query = filterInput.value.toLowerCase().trim();

        data.forEach(itemObj => {
            if (!itemObj.item) return;
            const titleText = (itemObj.title || '').toLowerCase();

            if (titleText.includes(query)) {
                itemObj.item.style.display = '';
            } else {
                itemObj.item.style.display = 'none';
            }
        });

        if (filterTimeout) clearTimeout(filterTimeout);

        if (query !== '') {
            filterTimeout = setTimeout(() => {
                filterInput.value = '';
                data.forEach(itemObj => {
                    if (itemObj.item) itemObj.item.style.display = '';
                });
            }, 10000);
        }
    });
}

function sortMostRecent() {
    const limit = Math.min(data.length, 45);

    let portionData = [];
    for (let i = 0; i < limit; i++) {
        portionData.push({
            title: data[i].title,
            timestamp: data[i].timestamp.trim(),
            count: data[i].count,
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
        data[i].title = sortedPortion[i].title;
        data[i].timestamp = sortedPortion[i].timestamp;
        data[i].count = sortedPortion[i].count;
    }

    syncData();
    window.scrollTo({ top: 0 });
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

main()
