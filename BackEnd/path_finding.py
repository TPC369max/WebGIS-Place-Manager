import networkx as nx      # 用于图的创建、操作和算法
import osmnx as ox         # 主要用于辅助函数，如 ox.distance.nearest_nodes
import heapq               # 用于实现 Dijkstra 算法中的优先队列

# 定义路网数据文件的路径 (应与 prepare_road_network.py 中保存的文件名一致)
ROAD_NETWORK_FILE = "Nantong_road_network.graphml"
road_graph = None # 全局变量，用于存储加载的路网图

def load_road_network():
    """加载预处理好的路网图数据到全局变量 road_graph。"""
    global road_graph # 声明我们要修改的是全局变量 road_graph
    if road_graph is None: # 仅在尚未加载时执行加载操作，避免重复加载
        try:
            road_graph=ox.load_graphml(ROAD_NETWORK_FILE)
            print(f"路网数据 '{ROAD_NETWORK_FILE}' 加载成功。")
            # 确保图的坐标参考系统 (CRS) 是 WGS84 (经纬度)，osmnx 默认下载的就是这种格式
            # osmnx 图对象的 graph 属性是一个字典，可以存储元数据
            if road_graph.graph.get('crs') != 'epsg:4326':
                 print(f"警告: 图的坐标参考系统是 {road_graph.graph.get('crs')}，请确保坐标兼容。")
        except FileNotFoundError:
            print(f"错误: 路网数据文件 '{ROAD_NETWORK_FILE}' 未找到。请先运行 prepare_road_network.py。")
        except Exception as e:
            print(f"加载路网数据时出错: {e}")
    return road_graph # 返回加载的图对象 (或 None 如果加载失败)

# 在模块加载时尝试加载一次路网数据 (可以在应用启动时调用)
#load_road_network()


def dijkstra_path(graph, start_node_id, end_node_id, weight='length'):
    """
    使用 Dijkstra 算法计算两个节点间的最短路径。
    参数:
        graph (nx.MultiDiGraph): 从 osmnx 获取的路网图 (通常是 MultiDiGraph)。
        start_node_id: 起点 OSM Node ID (整数)。
        end_node_id: 终点 OSM Node ID (整数)。
        weight (str): 边数据中表示权重的属性名 (例如 'length' 代表边的长度)。
    返回:
        tuple: (总路径长度, 包含路径中节点 ID 的列表)。
               如果无路径，则总路径长度为 float('infinity')，节点列表为空。
               如果输入无效，则返回 (None, [])。
    """
    # 检查图是否已加载，以及起终点是否存在于图中
    if not graph or start_node_id not in graph or end_node_id not in graph:
        print("错误: 图未加载或起点/终点不在图中。")
        return None, [] # 或者可以返回 (float('infinity'), []) 来表示不可达

    # 初始化距离字典：存储从起点到图中所有其他节点的最短距离估计
    # 初始时，所有节点的距离都设为无穷大
    distances = {node: float('infinity') for node in graph.nodes}
    # 初始化前驱节点字典：存储在最短路径上到达每个节点的前一个节点
    # 用于路径回溯
    predecessors = {node: None for node in graph.nodes}
    
    # 起点到自身的距离为 0
    distances[start_node_id] = 0
    
    # 创建一个优先队列 (最小堆)，用于存储待访问的节点
    # 队列中的元素是元组 (距离, 节点ID)，按距离排序
    priority_queue = [(0, start_node_id)]

    while priority_queue: # 当优先队列不为空时循环
        # 从优先队列中取出当前距离最小的节点
        current_distance, current_node_id = heapq.heappop(priority_queue)

        # 如果这个节点之前已经以更短的路径处理过，则跳过 (优化项)
        if current_distance > distances[current_node_id]:
            continue

        # 如果当前节点是终点，说明已找到最短路径
        if current_node_id == end_node_id:
            path = [] # 用于存储路径上的节点
            node = end_node_id # 从终点开始回溯
            while node is not None: # 当回溯到起点 (其前驱为None) 时停止
                path.append(node)
                node = predecessors[node] # 获取当前节点的前驱节点
            # 返回总长度和反转后的路径 (因为回溯是从终点到起点)
            return distances[end_node_id], path[::-1] 

        # 遍历当前节点的所有邻居 (后继节点)
        # 对于 MultiDiGraph (osmnx 的默认图类型)，一个节点对之间可能有多条边
        # graph.successors(node_id) 返回所有后继节点
        for neighbor_node_id in graph.successors(current_node_id):
            # 获取连接 current_node_id 和 neighbor_node_id 的所有边的数据
            # edge_data 是一个字典，键是边的 key (通常从0开始)，值是边的属性字典
            edge_data_dict = graph.get_edge_data(current_node_id, neighbor_node_id)
            
            # osmnx 经过 simplify=True 处理后，通常平行边会被合并，或者保留 key=0 的那条
            # 这里假设我们总是取 key=0 的边，或者需要逻辑来选择哪条边 (例如，取权重最小的)
            # 如果不确定，可以迭代 edge_data_dict.values() 并选择权重最小的边
            if 0 in edge_data_dict: # 确保 key=0 的边存在
                edge_attributes = edge_data_dict[0]
                edge_weight = edge_attributes.get(weight, float('infinity')) # 获取边的权重
            else:
                # 如果 key=0 的边不存在，可能需要更复杂的逻辑或跳过
                # print(f"警告: 节点 {current_node_id} 到 {neighbor_node_id} 之间没有 key=0 的边。边数据: {edge_data_dict}")
                # 简单处理：如果有多条边，取第一条找到的边的权重
                if edge_data_dict:
                    first_edge_key = next(iter(edge_data_dict))
                    edge_attributes = edge_data_dict[first_edge_key]
                    edge_weight = edge_attributes.get(weight, float('infinity'))
                else: # 理论上不应该发生，因为是邻居
                    edge_weight = float('infinity')


            # 计算通过当前节点到达邻居节点的总距离
            distance_via_current_node = current_distance + edge_weight
            
            # 如果通过当前节点到达邻居的距离更短
            if distance_via_current_node < distances[neighbor_node_id]:
                distances[neighbor_node_id] = distance_via_current_node # 更新到邻居的最短距离
                predecessors[neighbor_node_id] = current_node_id    # 更新邻居的前驱节点
                # 将邻居节点加入优先队列
                heapq.heappush(priority_queue, (distance_via_current_node, neighbor_node_id))
    
    # 如果循环结束时优先队列为空，且未到达终点，则说明终点不可达
    return float('infinity'), []

def get_shortest_path_coordinates(start_lat, start_lon, end_lat, end_lon):
    """
    主函数：接收起终点经纬度，返回最短路径的坐标序列和相关信息。
    """
    graph = load_road_network() # 确保路网图已加载
    if not graph:
        return None, "路网数据未加载或加载失败"

    try:
        # 1. 找到离用户点击的地理位置最近的路网节点
        # osmnx.distance.nearest_nodes 需要的坐标顺序是 (Y, X)，即 (纬度, 经度)
        
        start_node_osm_id = ox.distance.nearest_nodes(graph, X=start_lon, Y=start_lat)
        end_node_osm_id = ox.distance.nearest_nodes(graph, X=end_lon, Y=end_lat)
        print(f"起点ID: {start_node_osm_id}")
        print(f"终点ID: {end_node_osm_id}")

    except Exception as e:
        print(f"查找最近路网节点时出错: {e}")
        return None, "查找最近路网节点失败，可能输入坐标超出了路网范围"


    # 如果最近的起终点网络节点是同一个节点
    if start_node_osm_id == end_node_osm_id:
        # 直接返回该节点的坐标作为路径 (路径长度为0)
        node_data = graph.nodes[start_node_osm_id]
        # osmnx 节点数据中，'x' 是经度，'y' 是纬度
        return [[node_data['x'], node_data['y']]], "起终点映射到同一路网节点，路径长度为0"

    print(f"正在计算从路网节点 {start_node_osm_id} 到 {end_node_osm_id} 的路径")
    
    # 2. 使用 Dijkstra (或 NetworkX 内置的) 计算路径
    try:
        # 使用我们自己实现的 Dijkstra 算法
        total_length, node_ids_path = dijkstra_path(graph, start_node_osm_id, end_node_osm_id, weight='length')
        
        # 或者，更推荐使用 NetworkX 内置的、经过优化的最短路径算法
        # node_ids_path = nx.shortest_path(graph, source=start_node_osm_id, target=end_node_osm_id, weight="length")
        # total_length = nx.shortest_path_length(graph, source=start_node_osm_id, target=end_node_osm_id, weight="length")

        if not node_ids_path or total_length == float('infinity'): # 如果路径为空或长度为无穷大
            return None, "在路网中未找到从起点到终点的有效路径"
    except nx.NetworkXNoPath: # NetworkX 内置算法可能抛出此异常
        return None, "起点和终点之间在路网中没有路径"
    except Exception as e:
        print(f"路径计算过程中出错: {e}")
        return None, f"路径计算出错: {e}"

    # 3. 将路径中的节点 ID 序列转换为地理坐标点序列
    path_coordinates = []
    for node_id in node_ids_path:
        node_data = graph.nodes[node_id] # 获取节点数据
        # 确保坐标顺序是 [经度, 纬度]，符合 GeoJSON LineString 的常见格式
        path_coordinates.append([node_data['x'], node_data['y']]) 

    print(f"路径找到！长度: {total_length:.2f} 米, 包含 {len(path_coordinates)} 个坐标点。")
    return path_coordinates, f"路径长度: {total_length:.2f} 米"
