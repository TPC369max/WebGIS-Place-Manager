import psycopg2
import json

# 数据库连接URL，请根据您的实际配置修改
DATABASE_URL="postgresql://postgres:******@localhost:5432/postgis_info"

def get_placedata():
    """
    从 public.jsplaces 表获取所有地名数据。
    返回:
        list: 包含地名对象的列表，每个对象包含 Oid, name, PlaceLv, geometry。
              如果发生错误或没有数据，则返回空列表。
    """
    try:
        conn=psycopg2.connect(DATABASE_URL)
        cur=conn.cursor()
        # 选择 Oid, name, PlaceLv, 并将 geom 字段转换为 GeoJSON 格式的字符串
        cur.execute("SELECT \"Oid\",name,\"PlaceLv\",ST_AsGeoJSON(geom) FROM public.jsplaces")
        rows=cur.fetchall()
        conn.close()

        place_name=[]
        for row in rows:
            place_name.append({
                "Oid":row[0],
                "name":row[1],
                "PlaceLv":row[2],
                "geometry":json.loads(row[3]) if row[3] else None # 如果 geometry 为空，则设为 None
            })
        return place_name
    except Exception as e:
        print(f"数据库错误 (get_placedata):\n{e}")
        return [] # 发生错误时返回空列表

def get_jsGeoJSON():
    """
    从 public.js_geojson 表获取江苏省的行政区划面数据。
    返回:
        dict: GeoJSON FeatureCollection 对象。
              如果发生错误或没有数据，则返回一个空的 FeatureCollection。
    """
    try:
        conn=psycopg2.connect(DATABASE_URL)
        cur=conn.cursor()
        sql_query="""
        SELECT
            name,Shape_Length,Shape_Area,ST_AsGeoJSON(geom) AS geometry_str
        FROM public.js_geojson
        """
        cur.execute(sql_query)
        rows=cur.fetchall()
        conn.close()
        
        features=[]
        for row in rows:
            properties={
                "name":row[0],
                "Shape_Length":row[1],
                "Shape_Area":row[2]
            }
            geometry=json.loads(row[3]) if row[3] else None # 如果 geometry 为空，则设为 None
            feature={
                "type":"Feature",
                "properties":properties,
                "geometry":geometry
            }
            features.append(feature)

        feature_collection={
            "type":"FeatureCollection",
            "features":features
        }
        return feature_collection
    
    except Exception as e:
        print(f"从 js_geojson 表获取数据时数据库错误: {e}")
        return {"type": "FeatureCollection", "features": []} # 错误时返回空 FeatureCollection

def add_place(place_data):
    """
    向 public.jsplaces 表添加一条新的地名记录。
    参数:
        place_data (dict): 包含地名信息的字典 (Oid, name, PlaceLv, geometry)。
                           geometry 应为 GeoJSON Point 对象。
    返回:
        bool: 如果添加成功返回 True，否则返回 False。
    """
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        sql = """
        INSERT INTO public.jsplaces ("Oid", name, "PlaceLv", geom)
        VALUES (%s, %s, %s, ST_GeomFromGeoJSON(%s))
        """
        # 将 geometry 对象转换为 GeoJSON 字符串，以便 ST_GeomFromGeoJSON 函数使用
        geom_geojson_str = json.dumps(place_data['geometry']) if place_data.get('geometry') else None
        
        cur.execute(sql, (
            place_data['Oid'],
            place_data['name'],
            place_data['PlaceLv'],
            geom_geojson_str
        ))
        conn.commit() # 提交事务
        return True
    except Exception as e:
        if conn:
            conn.rollback() # 如果发生错误，回滚事务
        print(f"数据库添加错误 (add_place): {e}")
        return False
    finally:
        if conn:
            conn.close() # 关闭数据库连接

def update_place(original_oid, place_data):
    """
    更新 public.jsplaces 表中指定 Oid 的地名记录。
    参数:
        original_oid (str/int): 要更新记录的原始 Oid。
        place_data (dict): 包含更新后地名信息的字典。
                           Oid 字段可能已更改。geometry 应为 GeoJSON Point 对象。
    返回:
        bool: 如果更新成功（至少一行受影响）返回 True，否则返回 False。
    """
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        sql = """
        UPDATE public.jsplaces
        SET "Oid"=%s, name=%s, "PlaceLv"=%s, geom=ST_GeomFromGeoJSON(%s)
        WHERE "Oid"=%s 
        """
        geom_geojson_str = json.dumps(place_data['geometry']) if place_data.get('geometry') else None
        
        # original_oid 用于 WHERE 子句条件。place_data['Oid'] 是新的 Oid 值。
        cur.execute(sql, (
            place_data['Oid'], 
            place_data['name'],
            place_data['PlaceLv'],
            geom_geojson_str,
            original_oid # 用于 WHERE 子句的条件
        ))
        conn.commit()
        return cur.rowcount > 0 # 如果至少有一行被更新，则返回 True
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"数据库更新错误 (update_place): {e}")
        return False
    finally:
        if conn:
            conn.close()

def delete_places(oids: list):
    """
    从 public.jsplaces 表删除一个或多个指定 Oid 的地名记录。
    参数:
        oids (list): 包含要删除记录的 Oid 的列表。
    返回:
        int: 成功删除的记录数。如果发生数据库错误，返回 -1。
    """
    if not oids: # 如果列表为空，则不执行任何操作
        return 0
    conn = None
    deleted_count = 0
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # 确保 OID 格式适合 IN 子句（例如，字符串或数字的元组）
        # 假设数据库中的 Oid 列是 TEXT 类型或可以处理字符串表示。
        query_oids_tuple = tuple(map(str, oids)) # 将所有 OID 转换为字符串以保持一致性
        
        if not query_oids_tuple: # 如果 oids 例如是 [None]
            return 0

        # 使用参数化查询防止 SQL 注入
        sql_query = 'DELETE FROM public.jsplaces WHERE "Oid" IN %s'
        cur.execute(sql_query, (query_oids_tuple,)) # 将元组作为单个参数传递给 IN 子句
        
        deleted_count = cur.rowcount # 获取受影响的行数
        conn.commit()
        return deleted_count
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"数据库删除错误 (delete_places): {e}")
        return -1 # 用 -1 表示错误，以区别于成功删除 0 行
    finally:
        if conn:
            conn.close()