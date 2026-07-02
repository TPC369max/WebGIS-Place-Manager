import requests
import json

def get_district_data(city, level, amap_key):
    url = "https://restapi.amap.com/v3/config/district"
    params = {
        "keywords": city,
        "subdistrict": level,
        "key": amap_key,
        "extensions": "base",
        "output":json
    }

    response = requests.get(url, params=params)
    return response.json()

def extract_districts(data, level=3):
    results = []
    def recurse(districts):
        for d in districts:
            name = d['name']
            center = d.get('center', '')
            results.append({
                'name': name,
                'location': center
            })
            if d.get('districts'):
                recurse(d['districts'])
    recurse(data['districts'])
    return results

def save_to_json(data,filename="data.json"):
    try:
        with open(filename,'w',encoding='utf-8') as f:
            json.dump(data,f,ensure_ascii=False,indent=4)
        print(f"数据已保存到{filename}")
    except Exception as e:
        print(f"保存出错:{e}")

if __name__ == "__main__":
    amap_key = "9343de904bc7eba975d2f5f3351997e1"
    city = "南通市"
    level = 3  # 获取至村/镇/街道
    data = get_district_data(city, level, amap_key)
    save_to_json(data)
    all_districts = extract_districts(data)
    with open("district_places.json", "w", encoding="utf-8") as f:
        json.dump(all_districts, f, ensure_ascii=False, indent=4)
    print(f"获取了 {len(all_districts)} 条行政地名")
