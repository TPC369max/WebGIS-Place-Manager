# prepare_road_network.py
import osmnx as ox
import networkx as nx
import pickle # 用于保存和加载图对象

# 定义你感兴趣的区域 (例如，江苏省南京市)
# 你可以使用地名、边界框等
place_name = "Nantong, Jiangsu, China"
output_graph_file = "Nantong_road_network.graphml" # 或者 .pkl

print(f"Fetching road network for {place_name}...")
# 'drive' network type is suitable for car routing
# use 'walk' for pedestrian, 'bike' for cycling
# simplify=True simplifies graph topology (e.g. merges straight segments)
# retain_all=True keeps all disconnected subgraphs, False only keeps the largest
graph = ox.graph_from_place(place_name, network_type="drive", simplify=True)
print("Road network fetched.")

# 可选：保存图数据到文件，以便后续快速加载，而不是每次都从 OSM 下载
ox.save_graphml(graph, filepath=output_graph_file)
# 或者使用 pickle (可能更快，但可移植性稍差)
'''
with open(output_graph_file.replace('.graphml', '.pkl'), 'wb') as f:
    pickle.dump(graph, f, pickle.HIGHEST_PROTOCOL)
'''
print(f"Road network graph saved to {output_graph_file.replace('.graphml', '.pkl')}")

# 示例：查看图的一些基本信息
print(f"Number of nodes: {len(graph.nodes)}")
print(f"Number of edges: {len(graph.edges)}")
# print(list(graph.nodes(data=True))[0]) # 查看一个节点的数据
# print(list(graph.edges(data=True))[0]) # 查看一条边的数据 (包含长度等)