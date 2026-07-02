//
/*
document.addEventListener('DOMContentLoaded', () => {
    const dataList = document.getElementById("datalist");
    const addPlaceForm = document.getElementById("addPlaceForm");
    const placeNameInput = document.getElementById("placeName");
    const messageArea = document.getElementById("messageArea");

    function loadData() {
        fetch("http://127.0.0.1:8080/data")
            .then(res => {
                if (!res.ok) {
                    console.error("Network response was not ok:", res.status, res.statusText);
                    return res.text().then(text => { 
                        throw new Error(`Server error ${res.status}: ${text || res.statusText}`); 
                    });
                }
                return res.json();
            })
            .then(data => {
                dataList.innerHTML = ''; // Clear existing list items
                if (Array.isArray(data)) {
                    data.forEach(element => {
                        const li = document.createElement("li");
                        li.textContent = element.name + (element.id ? ` (ID: ${element.id})` : '');
                        dataList.appendChild(li);
                    });
                } else {
                    console.error('Received data is not an array:', data);
                    const li = document.createElement("li");
                    li.textContent = "Error: Data format is incorrect.";
                    li.style.color = "red";
                    dataList.appendChild(li);
                }
            })
            .catch(error => {
                console.error("Fetch error:", error);
                dataList.innerHTML = ''; // Clear list on error too
                const li = document.createElement("li");
                li.textContent = "Error loading data: " + error.message;
                li.style.color = "red";
                dataList.appendChild(li);
            });
    }

    if (addPlaceForm) {
        addPlaceForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent default form submission
            const placeName = placeNameInput.value.trim();
            messageArea.textContent = ''; // Clear previous messages

            if (!placeName) {
                messageArea.textContent = '地名不能为空!';
                messageArea.style.color = 'red';
                return;
            }

            fetch("http://127.0.0.1:8080/data", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: placeName })
            })
            .then(res => {
                if (!res.ok) {
                    // Try to parse error response as JSON, then text
                    return res.json().catch(() => res.text()).then(errBody => {
                        let errMsg = `Server error ${res.status}: `;                      
                        if (typeof errBody === 'object' && errBody.message) {
                            errMsg += errBody.message;
                        } else if (typeof errBody === 'string') {
                            errMsg += errBody;
                        } else {
                            errMsg += res.statusText;
                        }
                        throw new Error(errMsg);
                    });
                }
                return res.json(); 
            })
            .then(data => {
                console.log('Success:', data);
                messageArea.textContent = data.message || '地名已成功添加!';
                messageArea.style.color = 'green';
                placeNameInput.value = ''; // Clear input field
                loadData(); // Reload the list of places
            })
            .catch(error => {
                console.error('Error adding place:', error);
                messageArea.textContent = '添加地名失败: ' + error.message;
                messageArea.style.color = 'red';
            });
        });
    }

    // Initial load of data
    loadData();
});
*/

//路由
/*
'''
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)
'''
@app.route('/data', methods=['GET'])
def get_data():
    # Corrected: return a JSON array (list of dictionaries)
    data_to_return = [
        {"id": 1, "name": "南通"},
        {"id": 2, "name": "南京"}
    ]
    return jsonify(data_to_return)

@app.route('/data', methods=['POST'])
def add_place():
    data = request.json # Parses JSON from request body into a Python dict
    if not data or 'name' not in data:
        return jsonify({"status": "Error", "message": "Invalid data format, 'name' is required."}), 400
    print(f"新增地名: {data}") 
    return jsonify({"status": "OK", "message": "地名已添加", "added_data": data}), 201
    */

//首页添加
/*
            const endpoint = homeLink.dataset.endpoint; // 从 data-endpoint 获取后端路由

            console.log(`正在从: ${endpoint} 使用 POST 方法获取数据`);

            fetch(endpoint, { method: 'POST' }) // 使用 fetch API 发送 POST 请求
                .then(response => {
                    if (!response.ok) {
                        // 如果响应状态码不是 2xx，则抛出错误
                        throw new Error(`网络响应错误: ${response.status} ${response.statusText}`);
                    }
                    return response.json(); // 解析 JSON 格式的响应
                })
                .then(data => {
                    // 在这里处理从后端返回的地名数据
                    console.log('地名数据:', data);
                    // 你可以将数据渲染到地图上，或者更新页面上的其他元素
                    // 例如：
                    // displayPlaceNamesOnMap(data); // 假设你有一个这样的函数来在地图上显示地名
                })
                .catch(error => {
                    console.error('获取数据时发生问题:', error);
                    // 在这里处理错误，例如显示错误消息
                });
                */

//