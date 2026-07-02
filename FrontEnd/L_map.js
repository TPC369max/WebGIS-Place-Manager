window.fetchedPlaceData=null; // 用于存储从后端获取的原始地名数据
window.map=null; // Leaflet 地图对象实例
window.allMarkers={}; // 用于存储所有地名标记，以 Oid (字符串) 为键

/**
 * 将单个地名数据添加到地图和标记存储中
 * @param {object} place - 新的地名数据对象，包含 Oid, name, PlaceLv, geometry
 */
window.addMarker=function(place){
    if(place.geometry&&place.geometry.type==='Point'&&place.geometry.coordinates){
        const latLng=[place.geometry.coordinates[1],place.geometry.coordinates[0]] // Leaflet 使用 [lat, lng]
        const marker=L.marker(latLng);
        let popupContent=`
            <h4 style="text-align: center;">${place.name || '未知地名'}</h4>
            <p><strong>Oid:</strong> ${place.Oid || 'N/A'}</p>
            <p><strong>级别:</strong> ${place.PlaceLv || 'N/A'}</p>
        `;
        marker.bindPopup(popupContent);
        if (place.name){
            marker.bindTooltip(place.name,{
                permanent:true, // 永久显示 Tooltip
                direction:'auto', // 自动判断方向
                offset:L.point(10,0), // 偏移量
                className:'place-name-tooltip', // 自定义 CSS 类名
                opacity:0.9
            });
        }
        ann2.addLayer(marker); // ann2 是 MarkerClusterGroup
        window.allMarkers[String(place.Oid)]=marker; // 使用字符串类型的 Oid 作为键
    }else{
        console.warn("跳过无效的地名数据或非点几何:", place);
    }
}

/**
 * 更新地图上的标记。先移除旧标记，再添加新标记。
 * @param {string|number} originalOid - 要更新的标记的原始Oid
 * @param {object} updatedPlaceData - 更新后的地名数据
 */
window.updateMarker=function(originalOid,updatedPlaceData){
    const markerToUpdate=window.allMarkers[String(originalOid)]; // 使用字符串类型的 Oid 查找
    if (markerToUpdate){
        ann2.removeLayer(markerToUpdate); // 从聚合图层中移除
        delete window.allMarkers[String(originalOid)]; // 从存储中删除
        window.addMarker(updatedPlaceData); // 添加更新后的标记 (addMarker内部会处理Oid的字符串转换)
    } else {
        console.warn("尝试更新一个不存在的标记 (Oid):", originalOid);
    }
}

/**
 * 从地图上删除标记。
 * @param {string|number} oidToDelete - 要删除的标记的Oid。
 * @returns {boolean} - 如果成功删除则返回true，否则返回false。
 */
window.deleteMarker=function(oidToDelete){
    const marker=window.allMarkers[String(oidToDelete)]; // 使用字符串类型的 Oid 查找
    if (marker){
        ann2.removeLayer(marker); // 从聚合图层中移除
        delete window.allMarkers[String(oidToDelete)]; // 从存储中删除
        return true;
    } else {
        return false; // 未找到标记
    }
}

var BING_KEY = 'AuhiCJHlGzhg93IqUH_oCpl_-ZUrIE6SPftlyGYUvr9Amx5nzA-WqGcPquyFZl4L' // Bing Maps API Key

// 标记图层定义
var ann1=L.layerGroup(); // 用于加载江苏面数据
window.ann2=L.markerClusterGroup({ // 用于地名点聚合，提高性能
    disableClusteringAtZoom: 14, // 缩放到此级别时禁用聚合
    maxClusterRadius:100 // 聚合簇的最大半径（像素）
});
var ann3=L.layerGroup(); // 备用图层，当前未使用

// 底图图层定义
var layer1=L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png',{
    attribution:'© <a href="https://arcgisonline.com/copyright">Esri Map</a> contributors'
});
var layer2=L.tileLayer.bing(BING_KEY); // Bing 卫星影像
var layer3=L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',{
    subdomains: ["1", "2", "3", "4"], // 高德子域名
    attribution:'© <a href="https://autonavi.com">高德地图</a> contributors'
});
var defaultLayer = L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}.png', {
    attribution: '© <a href="https://arcgisonline.com/copyright">Esri Map</a> contributors'
}); // 默认 Esri 街道图

// 底图图层组
var baseLayers = {
"Esri街道图": defaultLayer,
"Esri卫星影像": layer1,
"Bing卫星影像": layer2,
"高德街道图": layer3
};
// 叠加图层组
var overLayers={
    "加载江苏面数据":ann1,
    "加载江苏地名数据":ann2
}

// 初始化地图
const map =new L.map('map',{ // 'map' 是 HTML 中 div 的 ID
    center:[35,100], // 初始中心点
    zoom:5, // 初始缩放级别
    layers:[defaultLayer], // 默认加载的图层
    attributionControl:true, // 显示版权控件
    zoomControl:false, // 禁用默认缩放控件，使用自定义的
    fullscreenControl:true, // 启用全屏控件
    fullscreenControlOptions:{
        position :'topright', // 全屏控件位置
        title: '全屏', 
        titleCancel: '退出全屏'
    }
});
window.map=map; // 将地图实例暴露到全局，方便其他脚本访问

// 添加图层控制控件
L.control.layers(baseLayers,overLayers,{hideSingleBase:true}).addTo(map);

// 添加自定义缩放控件
var zoomControl= L.control.zoom({
    zoomInTitle:'放大',
    zoomOutTitle:'缩小',
    position:'topleft' // 位置
});
map.addControl(zoomControl);

// 添加比例尺控件
var scaleControl= L.control.scale({
    maxWidth:200, // 最大宽度
    imperial:false, // 不使用英制单位
    position : 'bottomleft' // 位置
});
map.addControl(scaleControl);

// 设置地图初始边界为江苏省大致范围
var corner1 = L.latLng(34.669,116.059),
corner2 = L.latLng(30.902,122.651),
jsBound = L.latLngBounds(corner1, corner2);
map.fitBounds(jsBound); // 地图缩放到此边界


// 添加江苏省 GeoJSON 图层
function AddJsGeoJsonLayer() {
    fetch('/js_polygon_data') // 从后端获取数据
    .then(response=>{
        if (!response.ok){
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json()
    })
    .then(data=>{
        if (data && data.type==="FeatureCollection"&&data.features){
            console.log("从后端收到的 js_geojson 数据:", data);
            const geoJSONLayer=L.geoJSON(data,{
                onEachFeature:(feature,layer)=>{ // 为每个要素设置交互
                    layer.bindPopup(`
                            <table>
                                <tr><td colspan="2" style="font-weight:bold; text-align:center;">${feature.properties.name || 'N/A'}</td></tr>
                                <tr><td>类型</td><td>地级市</td></tr>
                                <tr><td>周长</td><td>${feature.properties.Shape_Length ? (feature.properties.Shape_Length / 1000).toFixed(2) + '千米(Km)' : 'N/A'}</td></tr>
                                <tr><td>面积</td><td>${feature.properties.Shape_Area ? (feature.properties.Shape_Area / 1000000).toFixed(2) + '平方千米(Km<sup>2</sup>)' : 'N/A'}</td></tr>
                            </table>
                        `);
                    layer.on({ // 鼠标悬浮和移开事件
                        mouseover:(e)=>{
                            const targetLayer=e.target;
                            targetLayer.setStyle({ // 高亮样式
                                color:'#53ff1a',
                                weight:3,
                                fillOpacity:0.6
                            });
                        },
                        mouseout:(e)=>{
                            geoJSONLayer.resetStyle(e.target); // 恢复默认样式
                        }
                    });
                },
                style:(feature)=>{ // 设置默认样式
                    return {
                        color: '#99ff99', 
                        weight: 2,
                        opacity: 1,
                        fillColor: '#99ff99', 
                        fillOpacity: 0.3
                    };
                }
            }).addTo(ann1); // 添加到 ann1 图层
        }
        else {
            console.error("从后端获取的 js_geojson 数据格式不正确或为空。");
        }
    })
    .catch(error => console.error("加载江苏面数据失败:", error));
}

// 添加地名点标记图层
function AddPlaceMarkers() {
    fetch('/data_from_postgis',{method:'POST'}) // 从后端获取地名数据
        .then(response=>{
            if (!response.ok){
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data=>{
            if (Array.isArray(data)){
                console.log("从后端收到的地名数据 (for MarkerCluster):", data);
                window.fetchedPlaceData=data; // 存储原始数据
                data.forEach(place=>window.addMarker(place)); // 为每个地名添加标记
            }else{
                console.error("从后端获取的地名数据格式不正确或为空。");
            }
        })
        .catch(error=>{
            console.error('加载地名标记失败:', error);
        })
}

/**
 * 根据 Oid 查找地图上的标记。
 * @param {string|number} oid - 要查找的标记的 Oid。
 * @returns {L.Marker|null} - 找到的标记对象，或 null。
 */
function findMarkerByOid(oid){
    return window.allMarkers[String(oid)]||null; // 使用字符串类型的 Oid 查找
}

// 更新并显示当前缩放级别
const currentZoomSpan=document.getElementById('current-zoom');
function updateZoomDisplay(){
    const zoomLevel=map.getZoom();
    if (currentZoomSpan) { // 确保元素存在
        currentZoomSpan.textContent=zoomLevel;
    }
}
map.on('zoomend',function(){ // 监听地图缩放结束事件
    updateZoomDisplay();
});

// 页面加载时执行
AddJsGeoJsonLayer();
AddPlaceMarkers();
updateZoomDisplay(); // 初始加载时也更新一次缩放级别