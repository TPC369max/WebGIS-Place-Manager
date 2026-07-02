import json
import psycopg2
import os
from psycopg2 import sql

DATABASE_URL="postgresql://postgres:******@localhost:5432/postgis_info"
TABLE_NAME="js_geojson"
SCRIPT_DIR=os.path.dirname(os.path.abspath(__file__))
FILE_PATH=os.path.join(os.path.dirname(SCRIPT_DIR),'FrontEnd','leaflet','jsgeo.json')

def load_geojson(file_path):
    try:
        with open(file_path,'r',encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"错误：GeoJSON文件未找到'{file_path}'")
        return None
    except json.JSONDecodeError:
        print(f"错误：GeoJSON文件格式无效'{file_path}'")
        return None

def insert_data(geojson_data,db_url,table_name):
    if not geojson_data or geojson_data.get("type")!="FeatureCollection"or "features" not in geojson_data:
        print("错误: 无效的 GeoJSON FeatureCollection 数据。")
        return
    conn=None
    insert_count=0
    try:
        conn=psycopg2.connect(db_url)
        cur=conn.cursor()
        print(f"开始向表 '{table_name}' 插入数据...")

        for feature in geojson_data["features"]:
            if feature.get("type")!="Feature":
                print("跳过非 Feature 类型的元素。")
                continue

            geometry_obj=feature.get("geometry")
            properties_obj=feature.get("properties",{})

            if not geometry_obj:
                print("跳过没有几何信息的要素。")
                continue

            geometry_str=json.dumps(geometry_obj)

            objectid=properties_obj.get("OBJECTID")
            adcode=str(properties_obj.get("adcode",""))
            name=properties_obj.get("name")
            center_text=properties_obj.get("center")
            centeroid_text=properties_obj.get("centeroid")
            children_num=properties_obj.get("childrenNum")
            sub_feature_index = properties_obj.get("subFeatureIndex")
            shape_length = properties_obj.get("Shape_Length")
            shape_area = properties_obj.get("Shape_Area")

            insert_query=sql.SQL("""
                INSERT INTO {table} (
                    objectid, adcode, name, center_text, centroid_text,
                    children_num, sub_feature_index, shape_length, shape_area, geom
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)
                );
            """).format(table=sql.Identifier(table_name))

            try:
                cur.execute(insert_query,(
                    objectid,adcode,name,center_text,centeroid_text,
                    children_num,sub_feature_index,shape_length,shape_area,
                    geometry_str
                ))
                insert_count+=1
            except Exception as e_insert:
                print(f"插入要素失败 (OBJECTID: {objectid}): {e_insert}")
                print(f"  问题数据: geometry={geometry_str[:100]}..., properties={properties_obj}")
                conn.rollback() # 回滚当前事务中的失败插入

        conn.commit()
        print(f"成功插入 {insert_count} 个要素到表 '{table_name}'。")

    except Exception as e_general:
        print(f"发生未知错误: {e_general}")
        if conn:
            conn.rollback()
    finally :
        if cur:
            cur.close()
        if conn:
            conn.close()

if __name__=="__main__":
    data=load_geojson(FILE_PATH)
    if data:
        insert_data(data,DATABASE_URL,TABLE_NAME)