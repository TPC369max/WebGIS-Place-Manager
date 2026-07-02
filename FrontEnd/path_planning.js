// 全局变量，用于存储路径规划相关的地图对象
window.startMarkerPath = null;
window.endMarkerPath = null;
window.plannedPathLayer = null;

/**
 * 在地图上设置路径规划的起点或终点标记。
 * @param {L.LatLng} latLng - 点击的经纬度。
 * @param {string} type - 'start' 或 'end'。
 */
function setPathPointMarker(latLng, type) {
    if (!window.map) {
        console.error("Map object (window.map) not available in setPathPointMarker.");
        return;
    }
    const iconColor = (type === 'start') ? 'green' : 'red';
    const marker = L.marker(latLng, { 
        draggable: true,
        icon: L.icon({
            iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${iconColor}.png`,
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
        })
    });

    const coordsDisplayId = type === 'start' ? 'start-point-coords' : 'end-point-coords';
    const coordsDisplayEl = document.getElementById(coordsDisplayId);

    if (type === 'start') {
        if (window.startMarkerPath) window.map.removeLayer(window.startMarkerPath);
        window.startMarkerPath = marker;
    } else if (type === 'end') {
        if (window.endMarkerPath) window.map.removeLayer(window.endMarkerPath);
        window.endMarkerPath = marker;
    }
    if (coordsDisplayEl) coordsDisplayEl.textContent = `${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`;
    marker.addTo(window.map);

    marker.on('dragend', function(event) {
        const newLatLng = event.target.getLatLng();
        if (coordsDisplayEl) coordsDisplayEl.textContent = `${newLatLng.lat.toFixed(5)}, ${newLatLng.lng.toFixed(5)}`;
        
        const pathResultEl = document.getElementById('path-result-message');
        if (window.plannedPathLayer && pathResultEl && typeof updatePathFeedback === "function") {
             updatePathFeedback("提示：起/终点已移动，请重新点击“计算路径”按钮。", "info");
        }
        // 通知 script.js 检查按钮状态
        if (typeof checkIfPathCanBeCalculated === "function") checkIfPathCanBeCalculated();
    });
}

/**
 * 在地图上绘制计算出的路径。
 * @param {Array<Array<number>>} pathCoords - 路径坐标点序列 [[lng, lat], ...]
 */
function drawPlannedPath(pathCoords) {
    if (!window.map) {
        console.error("Map object (window.map) not available in drawPlannedPath.");
        return;
    }
    if (window.plannedPathLayer) {
        window.map.removeLayer(window.plannedPathLayer);
    }
    const latLngPath = pathCoords.map(coord => [coord[1], coord[0]]); // Leaflet Polyline 需要 [lat, lng]
    window.plannedPathLayer = L.polyline(latLngPath, { color: 'blue', weight: 5 }).addTo(window.map);
    if (latLngPath.length > 0) {
        window.map.fitBounds(window.plannedPathLayer.getBounds());
    }
}

/**
 * 清除路径规划相关的地图元素和状态。
 */
function clearPathPlanningMapElements() {
    if (!window.map) {
        // console.error("Map object (window.map) not available in clearPathPlanningMapElements.");
        // 在初始加载时，map可能还未创建，此时调用此函数是正常的，不应报错
        return;
    }
    if (window.startMarkerPath) {
        window.map.removeLayer(window.startMarkerPath);
        window.startMarkerPath = null;
    }
    if (window.endMarkerPath) {
        window.map.removeLayer(window.endMarkerPath);
        window.endMarkerPath = null;
    }
    if (window.plannedPathLayer) {
        window.map.removeLayer(window.plannedPathLayer);
        window.plannedPathLayer = null;
    }
    
    // UI 文本由 script.js 中的 updatePathFeedback 和按钮状态管理函数处理
    const startCoordsEl = document.getElementById('start-point-coords');
    const endCoordsEl = document.getElementById('end-point-coords');
    if (startCoordsEl) startCoordsEl.textContent = '未选择';
    if (endCoordsEl) endCoordsEl.textContent = '未选择';

    const calculateBtn = document.getElementById('calculate-path-btn');
    if(calculateBtn) calculateBtn.disabled = true;
}

// console.log("path_planning.js loaded");