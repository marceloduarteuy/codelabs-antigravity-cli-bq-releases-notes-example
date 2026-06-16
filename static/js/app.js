// STATE MANAGEMENT
let appState = {
    releases: [],
    filteredReleases: [],
    searchQuery: '',
    activeFilter: 'all',
    lastChecked: null,
    selectedUpdate: null,
    activeTemplate: 'default'
};

// SELECTORS
const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    refreshIcon: document.getElementById('refresh-icon'),
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    filterTagsContainer: document.getElementById('filter-tags-container'),
    releasesContainer: document.getElementById('releases-container'),
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    noResultsState: document.getElementById('no-results-state'),
    retryBtn: document.getElementById('retry-btn'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    
    // Stats
    statTotalReleases: document.getElementById('stat-total-releases'),
    statTotalUpdates: document.getElementById('stat-total-updates'),
    statLastChecked: document.getElementById('stat-last-checked'),
    
    // Modal
    tweetModal: document.getElementById('tweet-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    cancelModalBtn: document.getElementById('cancel-modal-btn'),
    tweetShareBtn: document.getElementById('tweet-share-btn'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCounter: document.getElementById('char-counter'),
    modalUpdateBadge: document.getElementById('modal-update-badge'),
    modalUpdateDate: document.getElementById('modal-update-date'),
    modalUpdateContent: document.getElementById('modal-update-content'),
    templateOptions: document.querySelectorAll('.template-option')
};

// INIT APP
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
});

// FETCH RELEASES FROM BACKEND
async function fetchReleases(forceRefresh = false) {
    showLoading();
    
    let url = '/api/releases';
    if (forceRefresh) {
        url += '?refresh=true';
        elements.refreshIcon.classList.add('rotating');
        elements.refreshBtn.disabled = true;
    }
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.releases) {
            appState.releases = data.releases;
            appState.lastChecked = new Date();
            updateStats();
            applyFiltersAndSearch();
            showContent();
        } else {
            showError(data.error || "Failed to parse feed data");
        }
    } catch (error) {
        console.error("Fetch error:", error);
        showError("Could not reach the server. Please ensure the Flask app is running.");
    } finally {
        elements.refreshIcon.classList.remove('rotating');
        elements.refreshBtn.disabled = false;
    }
}

// SETUP EVENT LISTENERS
function setupEventListeners() {
    // Refresh buttons
    elements.refreshBtn.addEventListener('click', () => fetchReleases(true));
    elements.retryBtn.addEventListener('click', () => fetchReleases(true));
    
    // Search
    elements.searchInput.addEventListener('input', (e) => {
        appState.searchQuery = e.target.value.toLowerCase().trim();
        elements.clearSearchBtn.style.display = appState.searchQuery ? 'block' : 'none';
        applyFiltersAndSearch();
    });
    
    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        appState.searchQuery = '';
        elements.clearSearchBtn.style.display = 'none';
        applyFiltersAndSearch();
    });
    
    // Filter tags
    elements.filterTagsContainer.addEventListener('click', (e) => {
        const tag = e.target.closest('.filter-tag');
        if (!tag) return;
        
        document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        
        appState.activeFilter = tag.dataset.type;
        applyFiltersAndSearch();
    });
    
    // Reset filters
    elements.resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Modal buttons
    elements.closeModalBtn.addEventListener('click', closeModal);
    elements.cancelModalBtn.addEventListener('click', closeModal);
    elements.tweetShareBtn.addEventListener('click', shareOnTwitter);
    
    // Modal background click
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) closeModal();
    });
    
    // Tweet textarea typing
    elements.tweetTextarea.addEventListener('input', updateCharCount);
    
    // Template selectors
    elements.templateOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            elements.templateOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            appState.activeTemplate = opt.dataset.template;
            generateTweetDraft();
        });
    });
}

// FILTER & SEARCH LOGIC
function applyFiltersAndSearch() {
    const query = appState.searchQuery;
    const filter = appState.activeFilter;
    
    // Copy releases list
    let filtered = [];
    
    appState.releases.forEach(release => {
        // Filter updates inside each release
        const matchedUpdates = release.updates.filter(update => {
            const matchesFilter = filter === 'all' || update.type.toLowerCase() === filter.toLowerCase();
            const matchesSearch = !query || 
                update.type.toLowerCase().includes(query) || 
                update.text.toLowerCase().includes(query) || 
                release.date.toLowerCase().includes(query);
            
            return matchesFilter && matchesSearch;
        });
        
        if (matchedUpdates.length > 0) {
            filtered.push({
                ...release,
                updates: matchedUpdates
            });
        }
    });
    
    appState.filteredReleases = filtered;
    renderReleases();
    updateStats(true); // update counts only for current filters
}

// RESET ALL FILTERS
function resetFilters() {
    elements.searchInput.value = '';
    appState.searchQuery = '';
    elements.clearSearchBtn.style.display = 'none';
    
    document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
    document.querySelector('.filter-tag[data-type="all"]').classList.add('active');
    appState.activeFilter = 'all';
    
    applyFiltersAndSearch();
}

// UPDATE STATS COUNTER
function updateStats(filteredOnly = false) {
    if (!filteredOnly) {
        elements.statTotalReleases.textContent = appState.releases.length;
        
        let totalUpdates = 0;
        appState.releases.forEach(r => totalUpdates += r.updates.length);
        elements.statTotalUpdates.textContent = totalUpdates;
    }
    
    if (appState.lastChecked) {
        const timeStr = appState.lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        elements.statLastChecked.textContent = timeStr;
    }
}

// RENDER RELEASES FEED
function renderReleases() {
    elements.releasesContainer.innerHTML = '';
    
    if (appState.filteredReleases.length === 0) {
        elements.releasesContainer.style.display = 'none';
        elements.noResultsState.style.display = 'flex';
        return;
    }
    
    elements.noResultsState.style.display = 'none';
    elements.releasesContainer.style.display = 'flex';
    
    appState.filteredReleases.forEach(release => {
        const releaseGroup = document.createElement('div');
        releaseGroup.className = 'release-group';
        
        // Group Date Header
        const heading = document.createElement('div');
        heading.className = 'release-date-heading';
        heading.innerHTML = `<span><i class="fa-regular fa-calendar-days"></i> ${release.date}</span>`;
        releaseGroup.appendChild(heading);
        
        // Updates List Container
        const listContainer = document.createElement('div');
        listContainer.className = 'release-updates-list';
        
        release.updates.forEach(update => {
            const card = document.createElement('div');
            const lowerType = update.type.toLowerCase();
            card.className = `update-card type-${lowerType}`;
            
            // Render Header
            const header = document.createElement('div');
            header.className = 'update-card-header';
            header.innerHTML = `
                <span class="badge badge-${lowerType}">${update.type}</span>
                <div class="card-actions">
                    <button class="action-icon-btn btn-tweet-action" title="Tweet about this update">
                        <i class="fa-brands fa-x-twitter"></i>
                    </button>
                    <a href="${update.link}" target="_blank" rel="noopener noreferrer" class="action-icon-btn" title="Open official documentation">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a>
                </div>
            `;
            
            // Render Body
            const body = document.createElement('div');
            body.className = 'update-card-content';
            body.innerHTML = update.html;
            
            card.appendChild(header);
            card.appendChild(body);
            listContainer.appendChild(card);
            
            // Attach Tweet Button Click Event
            header.querySelector('.btn-tweet-action').addEventListener('click', (e) => {
                e.preventDefault();
                openTweetComposer(update, release.date);
            });
        });
        
        releaseGroup.appendChild(listContainer);
        elements.releasesContainer.appendChild(releaseGroup);
    });
}

// VIEW STATES
function showLoading() {
    elements.loadingState.style.display = 'flex';
    elements.releasesContainer.style.display = 'none';
    elements.errorState.style.display = 'none';
    elements.noResultsState.style.display = 'none';
}

function showContent() {
    elements.loadingState.style.display = 'none';
    elements.errorState.style.display = 'none';
}

function showError(msg) {
    elements.loadingState.style.display = 'none';
    elements.releasesContainer.style.display = 'none';
    elements.noResultsState.style.display = 'none';
    
    elements.errorMessage.textContent = msg;
    elements.errorState.style.display = 'flex';
}

// TWEET MODAL FUNCTIONS
function openTweetComposer(update, date) {
    appState.selectedUpdate = update;
    appState.selectedUpdate.date = date;
    
    // Set previews in modal
    elements.modalUpdateBadge.className = `badge badge-${update.type.toLowerCase()}`;
    elements.modalUpdateBadge.textContent = update.type;
    elements.modalUpdateDate.textContent = date;
    elements.modalUpdateContent.textContent = update.text;
    
    // Reset active template to default
    appState.activeTemplate = 'default';
    elements.templateOptions.forEach(o => o.classList.remove('active'));
    document.querySelector('.template-option[data-type="all"]')?.classList.remove('active'); // fallback
    document.querySelector('.template-option[data-template="default"]').classList.add('active');
    
    generateTweetDraft();
    
    elements.tweetModal.style.display = 'flex';
}

function closeModal() {
    elements.tweetModal.style.display = 'none';
    appState.selectedUpdate = null;
}

// GENERATE DRAFT BASED ON SELECTED TEMPLATE
function generateTweetDraft() {
    if (!appState.selectedUpdate) return;
    
    const update = appState.selectedUpdate;
    const type = update.type.toUpperCase();
    const link = update.link;
    const rawText = update.text;
    
    // Let's reserve characters for link & templates
    // Standard Twitter link consumes 23 chars, plus some hashtags
    let draft = '';
    
    // Build draft based on template selection
    if (appState.activeTemplate === 'default') {
        draft = `⚡ BigQuery Release - ${type}: "${rawText}"\n\nRead more: ${link} #BigQuery #GoogleCloud`;
    } else if (appState.activeTemplate === 'exciting') {
        draft = `🔥 Exciting Google Cloud BigQuery news! A new ${type} update has rolled out:\n\n"${rawText}"\n\nFull details: ${link} #BigQuery #Cloud #GCP`;
    } else if (appState.activeTemplate === 'alert') {
        draft = `📢 Dev Alert! BigQuery ${type} update:\n\n"${rawText}"\n\nDocs: ${link} #GoogleCloud #DataEngineering`;
    }
    
    // If the draft exceeds 280 characters, we need to intelligently truncate the rawText part
    if (draft.length > 280) {
        const extraChars = draft.length - 280;
        const availableTextSpace = rawText.length - extraChars - 5; // minus safety cushion for ellipsis
        
        if (availableTextSpace > 20) {
            const truncatedRawText = rawText.substring(0, availableTextSpace) + '...';
            
            if (appState.activeTemplate === 'default') {
                draft = `⚡ BigQuery Release - ${type}: "${truncatedRawText}"\n\nRead more: ${link} #BigQuery #GoogleCloud`;
            } else if (appState.activeTemplate === 'exciting') {
                draft = `🔥 Exciting Google Cloud BigQuery news! A new ${type} update has rolled out:\n\n"${truncatedRawText}"\n\nFull details: ${link} #BigQuery #Cloud #GCP`;
            } else if (appState.activeTemplate === 'alert') {
                draft = `📢 Dev Alert! BigQuery ${type} update:\n\n"${truncatedRawText}"\n\nDocs: ${link} #GoogleCloud #DataEngineering`;
            }
        }
    }
    
    elements.tweetTextarea.value = draft;
    updateCharCount();
}

// UPDATE CHARACTER COUNT STYLING
function updateCharCount() {
    const text = elements.tweetTextarea.value;
    const count = text.length;
    
    elements.charCounter.textContent = `${count} / 280`;
    
    // Character limit styles
    elements.charCounter.classList.remove('warning', 'error');
    if (count > 280) {
        elements.charCounter.classList.add('error');
        elements.tweetShareBtn.disabled = true;
        elements.tweetShareBtn.style.opacity = '0.5';
        elements.tweetShareBtn.style.cursor = 'not-allowed';
    } else {
        if (count > 250) {
            elements.charCounter.classList.add('warning');
        }
        elements.tweetShareBtn.disabled = count === 0;
        elements.tweetShareBtn.style.opacity = count === 0 ? '0.5' : '1';
        elements.tweetShareBtn.style.cursor = count === 0 ? 'not-allowed' : 'pointer';
    }
}

// OPEN X/TWITTER SHARE INTENT
function shareOnTwitter() {
    const text = elements.tweetTextarea.value;
    if (!text || text.length > 280) return;
    
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=550,height=420');
    closeModal();
}
