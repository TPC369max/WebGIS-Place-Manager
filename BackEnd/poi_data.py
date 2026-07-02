import requests
import json
import time

def get_amap_poi_data(keywords,city,amap_key,page):
    #url=f"https://restapi.amap.com/v3/place/text?keywords={keywords}&city={city}&output=json&offset=20&page={page}&key={amap_key}&extensions=all"
    url=f"https://restapi.amap.com/v5/place/text?keywords={keywords}&region={city}&city_limit=true&output=json&page_size=20&page_num={page}&key={amap_key}"

    try:
        response=requests.get(url)
        response.raise_for_status()
        data=response.json()
        return data
    except requests.exceptions.RequestException as e:
        print(f"请求出错:{e}")
        return None

def parse_amap_poi_data(data):
    if data and data['status']=='1'and data['pois']:
        results=[]
        for poi in data['pois']:
            name=poi['name']
            location=poi['location']
            address=poi['address']
            type=poi['type']
            adname=['adname']
            results.append({
                'name':name,
                'location':location,
                'address':address,
                'type':type,
                'adname':adname
            })
        return results
    else:
        print("未找到POI数据")
        return None
    
def save_to_json(data,filename="poi_data.json"):
    try:
        with open(filename,'w',encoding='utf-8') as f:
            json.dump(data,f,ensure_ascii=False,indent=4)
        print(f"数据已保存到{filename}")
    except Exception as e:
        print(f"保存出错:{e}")
    
if __name__=='__main__':
    keywords="村庄"
    city="南通市"
    amap_key="9343de904bc7eba975d2f5f3351997e1"
    all_pois=[]
    for page in range(1,111):
        data=get_amap_poi_data(keywords,city,amap_key,page)
        if data:
            pois=parse_amap_poi_data(data)
            if pois:
                all_pois.extend(pois)
                print(f"爬取第{page}页，共{len(all_pois)}条数据")
            else:
                break
        else:
            break
        time.sleep(0.5)

    if all_pois:
        print(f"共爬取{len(all_pois)}条数据")
        save_to_json(all_pois)
    else:
        print("没有爬取到任何数据")    