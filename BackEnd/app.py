from flask import Flask, jsonify, request
from flask_cors import CORS # 导入 CORS
from flask import send_from_directory
import os
import access_DB
import path_finding as p_f

app = Flask(__name__, static_folder='../FrontEnd', static_url_path='')
CORS(app) # 为所有路由启用 CORS，允许跨域请求
   
@app.route('/')
def serve_index():
    # 提供前端主页面
    return send_from_directory(app.static_folder, 'Nexus.html')

@app.route('/data_from_postgis', methods=['POST'])
def data_from_postgis():
    # 获取所有地名数据
    place_name=access_DB.get_placedata()
    if place_name is not None: # get_placedata 在错误或为空时返回 []
        print("收到 /data_from_postgis 请求")
        return jsonify(place_name)
    else : # 理论上不会到达这里，因为 get_placedata 总是返回列表
        print("接收地名数据为空或严重数据库错误！")
        return jsonify([]), 500 # 返回空列表和服务器错误状态码


@app.route('/js_polygon_data',methods=['GET'])
def route_js_polygon():
    # 获取江苏省面数据
    jsData=access_DB.get_jsGeoJSON()
    # jsData 在错误或为空时将是 {"type": "FeatureCollection", "features": []}
    if jsData: 
        print("收到 /js_polygon_data 请求")
        return jsonify(jsData)
    else : # 理论上不会到达这里
        print("接收江苏面数据为空或严重数据库错误！")
        return jsonify({"type": "FeatureCollection", "features": []}), 500

@app.route('/add_place_data', methods=['POST'])
def route_add_place():
    # 添加新的地名数据
    place_data = request.get_json() # 从请求体中获取 JSON 数据
    if not place_data:
        return jsonify({"success": False, "message": "请求中未包含数据"}), 400 # 400 Bad Request
    
    # 基本的后端验证 (可以更全面)
    required_fields = ['Oid', 'name', 'PlaceLv', 'geometry']
    if not all(field in place_data for field in required_fields) or \
       not isinstance(place_data.get('geometry'), dict) or \
       place_data['geometry'].get('type') != 'Point' or \
       not isinstance(place_data['geometry'].get('coordinates'), list) or \
       len(place_data['geometry']['coordinates']) != 2:
        return jsonify({"success": False, "message": "数据格式错误或缺少字段"}), 400

    success = access_DB.add_place(place_data)
    if success:
        return jsonify({"success": True, "message": "地名添加成功"})
    else:
        return jsonify({"success": False, "message": "数据库添加地名失败"}), 500 # 500 Internal Server Error

@app.route('/update_place_data', methods=['POST'])
def route_update_place():
    # 更新现有的地名数据
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "message": "请求中未包含数据"}), 400
    
    original_oid = data.get('original_oid') # 获取原始 OID
    updated_data = data.get('updated_data') # 获取更新后的数据

    if original_oid is None or not updated_data:
        return jsonify({"success": False, "message": "缺少original_oid或updated_data"}), 400
    
    # 对 updated_data进行基本验证
    required_fields = ['Oid', 'name', 'PlaceLv', 'geometry']
    if not all(field in updated_data for field in required_fields) or \
       not isinstance(updated_data.get('geometry'), dict) or \
       updated_data['geometry'].get('type') != 'Point' or \
       not isinstance(updated_data['geometry'].get('coordinates'), list) or \
       len(updated_data['geometry']['coordinates']) != 2:
        return jsonify({"success": False, "message": "updated_data格式错误或缺少字段"}), 400

    success = access_DB.update_place(original_oid, updated_data)
    if success:
        return jsonify({"success": True, "message": "地名修改成功"})
    else:
        # 可能是 OID 未找到，或者数据库操作失败
        return jsonify({"success": False, "message": "数据库修改地名失败 (可能Oid未找到或服务器错误)"}), 500


@app.route('/delete_place_data', methods=['POST'])
def route_delete_places():
    # 删除一个或多个地名数据
    data = request.get_json()
    oids_to_delete = data.get('oids') # 获取要删除的 OID 列表

    if not isinstance(oids_to_delete, list):
        return jsonify({"success": False, "message": "请求数据格式错误，需要 'oids' 列表"}), 400

    if not oids_to_delete: # 如果没有要删除的 OID，则认为操作成功
        return jsonify({"success": True, "message": "没有要删除的地名", "deleted_count_db": 0})

    deleted_count_db = access_DB.delete_places(oids_to_delete)

    if deleted_count_db == -1: # access_DB.delete_places 返回 -1 表示数据库错误
        return jsonify({"success": False, "message": "数据库删除操作发生错误", "deleted_count_db": 0}), 500
    elif deleted_count_db == len(oids_to_delete): # 所有请求的 OID 都成功删除
        return jsonify({"success": True, "message": f"成功删除 {deleted_count_db} 条地名数据。", "deleted_count_db": deleted_count_db})
    elif deleted_count_db >= 0: # 部分删除或没有找到匹配的 OID
        return jsonify({
            "success": deleted_count_db > 0, # 如果至少删除了一条，则认为部分成功
            "message": f"请求删除 {len(oids_to_delete)} 条，实际从数据库删除 {deleted_count_db} 条。",
            "deleted_count_db": deleted_count_db
        })

@app.route('/plan_path', methods=['POST'])
def route_plan_path():
    data = request.get_json() # 获取前端发送的 JSON 数据
    start_lat = data.get('start_lat')
    start_lon = data.get('start_lon')
    end_lat = data.get('end_lat')
    end_lon = data.get('end_lon')

    # 检查必需的坐标参数是否存在
    if None in [start_lat, start_lon, end_lat, end_lon]:
        return jsonify({"success": False, "message": "缺少起点或终点坐标"}), 400 # 400 Bad Request

    # 尝试将坐标转换为浮点数，处理可能的 ValueError
    try:
        start_lat, start_lon = float(start_lat), float(start_lon)
        end_lat, end_lon = float(end_lat), float(end_lon)
    except ValueError:
        return jsonify({"success": False, "message": "坐标格式错误，应为数字"}), 400
    
    # 调用路径计算函数 (假设在 access_DB.py 中)
    path_coords, message = p_f.get_shortest_path_coordinates(start_lat, start_lon, end_lat, end_lon)
    
    if path_coords: # 如果成功获取到路径坐标
        return jsonify({
            "success": True,
            "path": path_coords, # 路径坐标序列 [[lng1, lat1], [lng2, lat2], ...]
            "message": message   # 附加信息，如路径长度
        })
    else: # 如果路径计算失败
        return jsonify({"success": False, "message": message or "路径规划失败，未知错误"}), 500 # 500 Internal Server Error

if __name__ == '__main__':
    # 明确指定端口号，例如 5000
    app.run(host='127.0.0.1', port=5000, debug=True)