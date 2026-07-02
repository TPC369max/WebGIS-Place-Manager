document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Element Mappings (保持不变，确保 pathControlsPanel 和 pathPlanningContainer 引用正确) ---
    const elements = {
        navbar: document.getElementById('navbar'),
        content: document.getElementById('content'),
        map: document.getElementById('map'),
        homeLink: document.getElementById('home-link'),
        aboutLink: document.getElementById('about-link'),
        dataTableLink: document.getElementById('data-table-link'),
        pathPlanningLink: document.getElementById('path-planning-link'),
        aboutSection: document.getElementById('about-section'),
        dataTableSection: document.getElementById('data-table-section'),
        pathPlanningSection: document.getElementById('path-planning-section'),
        // 地名数据表相关...
        tableBody: document.querySelector('#place-data-table tbody'),
        searchFieldSelect: document.getElementById('search-field-select'),
        searchInput: document.getElementById('search-input'),
        searchBtn: document.getElementById('search-btn'),
        clearSearchBtn: document.getElementById('clear-search-btn'),
        paginationControls: document.getElementById('pagination-controls'),
        addPlaceBtn: document.getElementById('add-place-btn'),
        editSelectedBtn: document.getElementById('edit-selected-btn'),
        deleteSelectedBtn: document.getElementById('delete-selected-btn'),
        placeFormContainer: document.getElementById('place-form-container'),
        placeForm: document.getElementById('place-form'),
        formTitle: document.getElementById('form-title'),
        formSubmitBtn: document.getElementById('form-submit-btn'),
        editingOidInput: document.getElementById('editing-oid'),
        formCancelBtn: document.getElementById('form-cancel-btn'),
        placeFormError: document.getElementById('place-form-error'),
        // 路径规划相关
        pathPlanningContainer: document.querySelector('#path-planning-section .path-planning-container'),
        pathControlsPanel: document.querySelector('#path-planning-section .path-controls-panel'),
        setStartBtn: document.getElementById('set-start-btn'),
        setEndBtn: document.getElementById('set-end-btn'),
        calculatePathBtn: document.getElementById('calculate-path-btn'),
        clearPathBtn: document.getElementById('clear-path-btn'),
        pathResultMessage: document.getElementById('path-result-message'),
        currentZoomSpan: document.getElementById('current-zoom')
    };

    // --- State Variables (保持不变) ---
    let isPlaceDataInitialized = false;
    let allPlaceData = [];
    let filteredData = [];
    let currentPage = 1;
    const rowsPerPage = 100;
    let currentSearchTerm = '';
    let currentSearchField = 'name';
    let currentFormMode = 'add';
    window.currentPathMode = null;

    // --- Utility Functions (保持不变) ---
    function getNavbarHeight() { /* ... */ return elements.navbar ? elements.navbar.offsetHeight : 0; }
    function adjustContentLayout() { /* ... */
        const navbarHeight = getNavbarHeight();
        if (elements.content) {
            elements.content.style.marginTop = `${navbarHeight}px`;
            elements.content.style.height = `calc(100vh - ${navbarHeight}px)`;
        }
    }
    function setActiveNavLink(activeLink) { /* ... */
        document.querySelectorAll('#navbar ul li a').forEach(link => {
            link.classList.remove('active-nav-link');
        });
        if (activeLink) {
            activeLink.classList.add('active-nav-link');
        }
    }
    
    // --- Section Display Logic (修改 dataTableSection 部分) ---
    function showSection(sectionToShow, activeLink = null) {
        // Hide all major sections first
        [elements.map, elements.aboutSection, elements.dataTableSection, elements.pathPlanningSection].forEach(el => {
            if (el) el.classList.add('hidden');
        });

        const navbarHeight = getNavbarHeight();
        // 默认 #content 不滚动，让子 section 自己处理
        elements.content.style.overflowY = 'hidden'; 

        elements.pathPlanningSection.style.height = 'auto'; 
        elements.pathPlanningSection.style.flexShrink = '0';

        if (sectionToShow === elements.map && elements.homeLink === activeLink) {
            elements.map.classList.remove('hidden');
            elements.map.style.height = `calc(100vh - ${navbarHeight}px)`;
            if (window.map) {
                window.map.invalidateSize();
                if (window.map.off) window.map.off('click', onMapClickForPathPlanning);
            }
        } else if (sectionToShow === elements.aboutSection) {
            elements.aboutSection.classList.remove('hidden');
            // #about-section 已经在 CSS 中设置了 overflow-y: auto 和 flex-grow: 1
            if (window.map && window.map.off) window.map.off('click', onMapClickForPathPlanning);
        } else if (sectionToShow === elements.dataTableSection) {
            elements.dataTableSection.classList.remove('hidden');
            // #data-table-section 已经在 CSS 中设置了 overflow-y: auto 和 flex-grow: 1
            if (!isPlaceDataInitialized || (allPlaceData.length === 0 && window.fetchedPlaceData && window.fetchedPlaceData.length > 0)) {
                initializeTable();
            }
            if (window.map && window.map.off) window.map.off('click', onMapClickForPathPlanning);
        } else if (sectionToShow === elements.pathPlanningSection) {
            // ... (路径规划的逻辑基本不变，确保 #path-planning-section 高度由内容决定) ...
            elements.pathPlanningSection.classList.remove('hidden');
            elements.map.classList.remove('hidden'); 

            requestAnimationFrame(() => { // 确保DOM更新后获取高度
                const pathSectionRenderedHeight = elements.pathPlanningSection.offsetHeight;
                const mapHeight = `calc((100vh - ${navbarHeight}px) - ${pathSectionRenderedHeight}px)`;
                elements.map.style.height = mapHeight;
                
                if (window.map) {
                    window.map.invalidateSize(); 
                    window.map.on('click', onMapClickForPathPlanning);
                    const nantongCenter = L.latLng(31.98, 120.89); 
                    if (!window.map.getBounds().contains(nantongCenter) || window.map.getZoom() < 10) {
                         window.map.setView(nantongCenter, 11);
                    }
                }
                if (typeof clearPathPlanningMapElements === "function") clearPathPlanningMapElements();
                if (typeof updatePathFeedback === "function") updatePathFeedback('请先点击“设为起点”或“设为终点”按钮，然后在地图上选择。', 'info');
            });
        }
        setActiveNavLink(activeLink);
    }

    // --- Initializations & Event Listeners for Navigation ---
    adjustContentLayout();
    window.addEventListener('resize', () => {
        adjustContentLayout();
        const activeNavLink = document.querySelector('#navbar ul li a.active-nav-link');
        if (activeNavLink) {
            if (activeNavLink === elements.homeLink) showSection(elements.map, elements.homeLink);
            else if (activeNavLink === elements.aboutLink) showSection(elements.aboutSection, elements.aboutLink);
            else if (activeNavLink === elements.dataTableLink) showSection(elements.dataTableSection, elements.dataTableLink);
            else if (activeNavLink === elements.pathPlanningLink) showSection(elements.pathPlanningSection, elements.pathPlanningLink);
        }
    });

    if (elements.homeLink) elements.homeLink.addEventListener('click', (e) => { e.preventDefault(); showSection(elements.map, elements.homeLink); });
    if (elements.aboutLink) elements.aboutLink.addEventListener('click', (e) => { e.preventDefault(); showSection(elements.aboutSection, elements.aboutLink); });
    if (elements.dataTableLink) elements.dataTableLink.addEventListener('click', (e) => { e.preventDefault(); showSection(elements.dataTableSection, elements.dataTableLink); });
    if (elements.pathPlanningLink) elements.pathPlanningLink.addEventListener('click', (e) => { e.preventDefault(); showSection(elements.pathPlanningSection, elements.pathPlanningLink); });

    // --- 地名数据表逻辑 (保持不变) ---
    // ... (initializeTable, searchComponent, etc. as before)
    function initializeTable(){
        if (window.fetchedPlaceData){
            allPlaceData=[...window.fetchedPlaceData]; 
            isPlaceDataInitialized=true; 
            applySearchRender(); 
            searchComponent();  
        } else {
            if(elements.tableBody) elements.tableBody.innerHTML='<tr><td colspan="5">地名数据尚未加载。请先访问首页地图。</td></tr>';
            if(elements.paginationControls) elements.paginationControls.innerHTML='';
            console.warn("initializeTable: window.fetchedPlaceData 不可用。");
        }
    }
    function searchComponent(){
        if (elements.searchBtn) elements.searchBtn.addEventListener('click',applySearchRender);
        if (elements.searchInput) elements.searchInput.addEventListener('keypress', (e) => { if (e.key==='Enter') applySearchRender();});
        if (elements.clearSearchBtn) elements.clearSearchBtn.addEventListener('click', () => { if(elements.searchInput) elements.searchInput.value=''; applySearchRender();});
    }
    function applySearchRender(){
        currentSearchTerm = elements.searchInput ? elements.searchInput.value.trim().toLowerCase() : "";
        currentSearchField = elements.searchFieldSelect ? elements.searchFieldSelect.value : "name";
        if (currentSearchTerm===''){
            filteredData=[...allPlaceData]; 
        } else {
            filteredData=allPlaceData.filter(place=>{
                const fieldValue=place[currentSearchField]?String(place[currentSearchField]).toLocaleLowerCase():'';
                return fieldValue.includes(currentSearchTerm);
            });
        }
        currentPage=1; 
        renderTablePage(); 
        renderPaginationControls();
    }
    function renderTablePage(){ 
        if (!elements.tableBody) return;
        elements.tableBody.innerHTML = '';
        if (filteredData.length === 0) {
            elements.tableBody.innerHTML = `<tr><td colspan="5">${currentSearchTerm ? '未找到匹配的地名数据。' : '无地名数据可显示。'}</td></tr>`;
            return;
        }
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const pageData = filteredData.slice(startIndex, endIndex);

        pageData.forEach(place => {
            const row = elements.tableBody.insertRow();
            const cellSelect = row.insertCell();
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = String(place.Oid);
            checkbox.name = 'place_select_row';
            cellSelect.appendChild(checkbox);

            row.insertCell().textContent = place.Oid || 'N/A';
            row.insertCell().textContent = place.name || 'N/A';
            row.insertCell().textContent = place.PlaceLv || 'N/A';
            
            const cellCoordinate = row.insertCell();
            if (place.geometry && place.geometry.coordinates) {
                const lon = place.geometry.coordinates[0];
                const lat = place.geometry.coordinates[1];
                cellCoordinate.textContent = `[${lon.toFixed(4)},${lat.toFixed(4)}]`;
                cellCoordinate.style.cursor = 'pointer';
                cellCoordinate.style.color = 'blue';
                cellCoordinate.style.textDecoration = 'underline';
                cellCoordinate.addEventListener('click', function() {
                    showSection(elements.map, elements.homeLink); 
                    if (window.map) {
                        const targetLatLng = [lat, lon];
                        window.map.setView(targetLatLng, 15);
                        if (typeof findMarkerByOid === "function") {
                            const foundMarker = findMarkerByOid(place.Oid);
                            if (foundMarker) foundMarker.openPopup();
                        }
                    }
                });
            } else {
                cellCoordinate.textContent = 'N/A';
            }
        });
    }
    function renderPaginationControls(){ 
        if (!elements.paginationControls) return;
        elements.paginationControls.innerHTML = '';
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        if (totalPages <= 1) return;

        const createButton = (text, onClick, disabled) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.disabled = disabled;
            button.addEventListener('click', onClick);
            return button;
        };
        elements.paginationControls.appendChild(createButton('上一页', () => { if (currentPage > 1) { currentPage--; renderTablePage(); renderPaginationControls(); }}, currentPage === 1));
        const pageInfo = document.createElement('span');
        pageInfo.textContent = ` 第 ${currentPage} 页 / 共 ${totalPages} 页 `;
        pageInfo.style.margin = "0 10px";
        elements.paginationControls.appendChild(pageInfo);
        elements.paginationControls.appendChild(createButton('下一页', () => { if (currentPage < totalPages) { currentPage++; renderTablePage(); renderPaginationControls(); }}, currentPage === totalPages));
    }
    function openForm(mode, placeData = null){
        currentFormMode = mode;
        if(elements.placeForm) elements.placeForm.reset();
        if(elements.placeFormError) elements.placeFormError.textContent = '';
        if(elements.editingOidInput) elements.editingOidInput.value = '';
        const oidInput = document.getElementById('form-place-oid');
        if(oidInput) oidInput.disabled = false;

        if (mode === 'add') {
            if(elements.formTitle) elements.formTitle.textContent = '添加新地名';
            if(elements.formSubmitBtn) elements.formSubmitBtn.textContent = '确认添加';
        } else if (mode === 'edit' && placeData) {
            if(elements.formTitle) elements.formTitle.textContent = '修改地名信息';
            if(elements.formSubmitBtn) elements.formSubmitBtn.textContent = '确认修改';
            if(elements.editingOidInput) elements.editingOidInput.value = String(placeData.Oid);
            
            if(oidInput) { oidInput.value = placeData.Oid; oidInput.disabled = true;}
            const nameInput = document.getElementById('form-place-name');
            if(nameInput) nameInput.value = placeData.name || '';
            const levelInput = document.getElementById('form-place-level');
            if(levelInput) levelInput.value = placeData.PlaceLv || '';
            if (placeData.geometry && placeData.geometry.coordinates) {
                const lonInput = document.getElementById('form-place-lon');
                const latInput = document.getElementById('form-place-lat');
                if(lonInput) lonInput.value = placeData.geometry.coordinates[0];
                if(latInput) latInput.value = placeData.geometry.coordinates[1];
            }
        }
        if(elements.placeFormContainer) {
            elements.placeFormContainer.classList.remove('hidden');
            elements.placeFormContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }
    if (elements.addPlaceBtn) elements.addPlaceBtn.addEventListener('click', () => openForm('add'));
    if (elements.editSelectedBtn) elements.editSelectedBtn.addEventListener('click', () => { 
        const selectedCheckBoxes = document.querySelectorAll('#place-data-table tbody input[type="checkbox"]:checked');
        if (selectedCheckBoxes.length !== 1) { alert("请选择一个要修改的地名。"); return; }
        const oidToEdit = selectedCheckBoxes[0].value;
        const placeToEdit = allPlaceData.find(p => String(p.Oid) === oidToEdit);
        if (placeToEdit) openForm('edit', placeToEdit);
        else alert("未找到选中的地名数据。");
    });
    if (elements.deleteSelectedBtn) elements.deleteSelectedBtn.onclick = () => { 
        const selectedCheckBoxes = document.querySelectorAll('#place-data-table tbody input[type="checkbox"]:checked');
        const oidsToDelete = Array.from(selectedCheckBoxes).map(cb => cb.value);
        if (oidsToDelete.length === 0) { alert("请先选择要删除的地名。"); return; }
        if (confirm(`确定要删除选中的 ${oidsToDelete.length} 条地名数据吗？`)) {
            let frontendDeletedCount = 0;
            oidsToDelete.forEach(oidStr => {
                const initialLength = allPlaceData.length;
                allPlaceData = allPlaceData.filter(p => String(p.Oid) !== oidStr);
                if (allPlaceData.length < initialLength && typeof window.deleteMarker === "function" && window.deleteMarker(oidStr)) {
                    frontendDeletedCount++;
                }
            });
            applySearchRender(); 
            if (oidsToDelete.length > 0) { 
                fetch('/delete_place_data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oids: oidsToDelete })})
                .then(res => res.json()).then(data => alert(data.message || (data.success ? "删除成功" : "删除失败")))
                .catch(err => alert("删除请求失败: " + err));
            }
        }
    };
    if (elements.formCancelBtn) elements.formCancelBtn.addEventListener('click', () => { if(elements.placeFormContainer) elements.placeFormContainer.classList.add('hidden'); if(elements.placeFormError) elements.placeFormError.textContent = ''; });
    if (elements.placeForm) elements.placeForm.addEventListener('submit', function(event) { 
        event.preventDefault();
        if(elements.placeFormError) elements.placeFormError.textContent = '';

        const oidStr = document.getElementById('form-place-oid').value.trim();
        const name = document.getElementById('form-place-name').value.trim();
        const placeLv = document.getElementById('form-place-level').value.trim();
        const lonStr = document.getElementById('form-place-lon').value.trim();
        const latStr = document.getElementById('form-place-lat').value.trim();
        const originalOidForEdit = elements.editingOidInput.value;

        if (!oidStr || !name || !placeLv || !lonStr || !latStr) { if(elements.placeFormError) elements.placeFormError.textContent = '所有字段均为必填项！'; return; }
        const lon = parseFloat(lonStr); const lat = parseFloat(latStr);
        if (isNaN(lon) || lon < -180 || lon > 180) { if(elements.placeFormError) elements.placeFormError.textContent = '经度必须是 -180 到 180 之间的数字！'; return; }
        if (isNaN(lat) || lat < -90 || lat > 90) { if(elements.placeFormError) elements.placeFormError.textContent = '纬度必须是 -90 到 90 之间的数字！'; return; }
        const oid = oidStr;
        if (currentFormMode === 'add' && allPlaceData.some(p => String(p.Oid) === String(oid))) { if(elements.placeFormError) elements.placeFormError.textContent = `Oid "${oid}" 已存在！`; return; }

        const placeDataObject = { Oid: oid, name: name, PlaceLv: placeLv, geometry: { type: "Point", coordinates: [lon, lat] }};
        let apiUrl = '', successMsg = '', errorMsgPrefix = '';

        if (currentFormMode === 'add') {
            allPlaceData.unshift(placeDataObject);
            if (typeof window.addMarker === "function") window.addMarker(placeDataObject);
            apiUrl = '/add_place_data';
            successMsg = `地名 "${name}" 添加成功！`;
            errorMsgPrefix = '添加地名';
        } else if (currentFormMode === 'edit') {
            const indexInData = allPlaceData.findIndex(p => String(p.Oid) === String(originalOidForEdit));
            if (indexInData > -1) allPlaceData[indexInData] = { ...allPlaceData[indexInData], ...placeDataObject };
            if (typeof window.updateMarker === "function") window.updateMarker(originalOidForEdit, placeDataObject);
            apiUrl = '/update_place_data';
            successMsg = `地名 Oid: "${originalOidForEdit}" 修改成功！`;
            errorMsgPrefix = '修改地名';
        }

        fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: currentFormMode === 'add' ? JSON.stringify(placeDataObject) : JSON.stringify({ original_oid: originalOidForEdit, updated_data: placeDataObject }) })
        .then(res => res.json())
        .then(data => {
            if (data.success) alert(successMsg + " (服务器确认)");
            else alert(`${errorMsgPrefix}服务器失败: ${data.message}`);
        })
        .catch(err => alert(`${errorMsgPrefix}请求错误: ${err}`));

        applySearchRender();
        if(elements.placeForm) elements.placeForm.reset();
        if(elements.placeFormContainer) elements.placeFormContainer.classList.add('hidden');
    });

    // --- 路径规划逻辑 ---
    function updatePathFeedback(message, type = 'default') { /* ... */ 
        if (elements.pathResultMessage) {
            elements.pathResultMessage.textContent = message;
            elements.pathResultMessage.className = 'path-feedback'; 
            if (type === 'success') elements.pathResultMessage.classList.add('success-feedback');
            else if (type === 'error') elements.pathResultMessage.classList.add('error-feedback');
            else if (type === 'info') elements.pathResultMessage.classList.add('info-feedback');
        }
    }
    function onMapClickForPathPlanning(e) { /* ... */ 
        if (window.currentPathMode) {
            const funcName = window.currentPathMode === 'set_start' ? 'setStartBtn' : 'setEndBtn';
            if (typeof setPathPointMarker === "function") setPathPointMarker(e.latlng, window.currentPathMode.substring(4));
            window.currentPathMode = null;
            if (elements[funcName]) elements[funcName].classList.remove('active-path-btn');
            checkIfPathCanBeCalculated();
        }
    }
    if (elements.setStartBtn) elements.setStartBtn.addEventListener('click', () => { window.currentPathMode = 'set_start'; updatePathFeedback('模式：选择起点。请在地图上点击。','info'); elements.setStartBtn.classList.add('active-path-btn'); if(elements.setEndBtn) elements.setEndBtn.classList.remove('active-path-btn'); });
    if (elements.setEndBtn) elements.setEndBtn.addEventListener('click', () => { window.currentPathMode = 'set_end'; updatePathFeedback('模式：选择终点。请在地图上点击。','info'); elements.setEndBtn.classList.add('active-path-btn'); if(elements.setStartBtn) elements.setStartBtn.classList.remove('active-path-btn'); });
    function checkIfPathCanBeCalculated() { /* ... */ 
        if (elements.calculatePathBtn) {
            elements.calculatePathBtn.disabled = !(window.startMarkerPath && window.endMarkerPath);
        }
    }
    if (elements.calculatePathBtn) elements.calculatePathBtn.addEventListener('click', () => { /* ... */ 
        if (!window.startMarkerPath || !window.endMarkerPath) { updatePathFeedback('错误：请先选择起点和终点。', 'error'); return; }
        const startLatLng = window.startMarkerPath.getLatLng();
        const endLatLng = window.endMarkerPath.getLatLng();
        updatePathFeedback('正在计算路径...', 'info');
        elements.calculatePathBtn.disabled = true;

        fetch('/plan_path', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ start_lat: startLatLng.lat, start_lon: startLatLng.lng, end_lat: endLatLng.lat, end_lon: endLatLng.lng })})
        .then(res => res.json())
        .then(data => {
            if (data.success && data.path && typeof drawPlannedPath === "function") {
                drawPlannedPath(data.path);
                updatePathFeedback(`路径规划成功！${data.message || ''}`, 'success');
            } else {
                updatePathFeedback(`路径规划失败: ${data.message || '未知错误'}`, 'error');
                if(window.plannedPathLayer && window.map && typeof window.map.removeLayer === "function") window.map.removeLayer(window.plannedPathLayer);
            }
        })
        .catch(err => { console.error(err); updatePathFeedback('路径规划请求失败。', 'error'); })
        .finally(() => checkIfPathCanBeCalculated());
    });
    if (elements.clearPathBtn) elements.clearPathBtn.addEventListener('click', () => { /* ... */ 
        if(typeof clearPathPlanningMapElements === "function") clearPathPlanningMapElements();
        window.currentPathMode = null;
        if(elements.setStartBtn) elements.setStartBtn.classList.remove('active-path-btn');
        if(elements.setEndBtn) elements.setEndBtn.classList.remove('active-path-btn');
        updatePathFeedback('已清除选择和路径。', 'info');
    });

    // --- Initial View ---
    showSection(elements.map, elements.homeLink);
});